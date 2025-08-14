import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { adminDb, auth, isFirebaseAdminInitialized } from "@/lib/firebase-admin"
import { processCheckoutSessionCompleted } from "@/lib/stripe/webhook-processor"

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

async function verifyFirebaseInitializationWithRetry(
  maxRetries = 3,
): Promise<{ isReady: boolean; error?: string; diagnostics: any }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      attempt,
      maxRetries,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? "SET" : "MISSING",
        FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? "SET" : "MISSING",
        FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY
          ? "SET (length: " + (process.env.FIREBASE_PRIVATE_KEY?.length || 0) + ")"
          : "MISSING",
      },
      firebaseAdmin: {
        isFirebaseAdminInitialized: null as any,
        adminDbAvailable: null as any,
        authAvailable: null as any,
        adminDbType: null as any,
        authType: null as any,
      },
    }

    try {
      diagnostics.firebaseAdmin.isFirebaseAdminInitialized = isFirebaseAdminInitialized()
    } catch (error) {
      diagnostics.firebaseAdmin.isFirebaseAdminInitialized = `ERROR: ${error instanceof Error ? error.message : "Unknown error"}`
    }

    try {
      diagnostics.firebaseAdmin.adminDbAvailable = !!adminDb
      diagnostics.firebaseAdmin.adminDbType = typeof adminDb
    } catch (error) {
      diagnostics.firebaseAdmin.adminDbAvailable = `ERROR: ${error instanceof Error ? error.message : "Unknown error"}`
    }

    try {
      diagnostics.firebaseAdmin.authAvailable = !!auth
      diagnostics.firebaseAdmin.authType = typeof auth
    } catch (error) {
      diagnostics.firebaseAdmin.authAvailable = `ERROR: ${error instanceof Error ? error.message : "Unknown error"}`
    }

    // Check if Firebase is ready
    if (isFirebaseAdminInitialized() && adminDb && auth) {
      return { isReady: true, diagnostics }
    }

    // If not ready and we have more attempts, wait and retry
    if (attempt < maxRetries) {
      const waitTime = attempt * 100 // Progressive delay: 100ms, 200ms, 300ms
      console.log(`Firebase not ready on attempt ${attempt}/${maxRetries}, retrying in ${waitTime}ms...`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
      continue
    }

    // Final attempt failed
    let error = "Firebase Admin SDK initialization failed"
    if (!isFirebaseAdminInitialized()) {
      error = "Firebase Admin SDK is not initialized"
    } else if (!adminDb) {
      error = "Firebase Admin Database (adminDb) is not available"
    } else if (!auth) {
      error = "Firebase Admin Auth is not available"
    }

    return {
      isReady: false,
      error,
      diagnostics,
    }
  }

  return {
    isReady: false,
    error: "Max retries exceeded",
    diagnostics: { maxRetries, finalAttempt: maxRetries },
  }
}

// This is the main handler for Stripe webhooks
export async function POST(req: NextRequest) {
  const buf = await req.text()
  const sig = headers().get("Stripe-Signature")!

  let event: Stripe.Event
  const debugTrace: string[] = []

  try {
    debugTrace.push("1. Verifying webhook signature...")
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
    debugTrace.push("✅ Signature verified.")
  } catch (err) {
    const errorMessage = `❌ Webhook signature verification failed: ${err instanceof Error ? err.message : "Unknown error"}`
    console.error(errorMessage)
    debugTrace.push(errorMessage)
    return NextResponse.json(
      {
        error: "Webhook signature verification failed.",
        details: {
          debugTrace,
          errorStack: err instanceof Error ? err.stack : null,
        },
      },
      { status: 400 },
    )
  }

  debugTrace.push("2. Verifying Firebase initialization with retry logic...")
  const firebaseCheck = await verifyFirebaseInitializationWithRetry(3)
  if (!firebaseCheck.isReady) {
    const firebaseError = `❌ Firebase not ready after retries: ${firebaseCheck.error}`
    console.error(firebaseError, firebaseCheck.diagnostics)
    debugTrace.push(firebaseError)
    debugTrace.push(`Full diagnostics: ${JSON.stringify(firebaseCheck.diagnostics, null, 2)}`)

    return NextResponse.json(
      {
        error: "Firestore not initialized",
        details: {
          debugTrace,
          firebaseError: firebaseCheck.error,
          fullDiagnostics: firebaseCheck.diagnostics,
        },
      },
      { status: 500 },
    )
  }
  debugTrace.push("✅ Firebase Admin SDK verified and ready after retry logic.")

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    debugTrace.push("3. Received checkout.session.completed event.")
    debugTrace.push(`- Session ID: ${session.id}`)

    let userId: string | null = null

    // --- User Identification Logic ---
    debugTrace.push("4. Starting user identification process...")

    // Method 1: Check metadata for buyerUid (most reliable)
    if (session.metadata?.buyerUid) {
      userId = session.metadata.buyerUid
      debugTrace.push(`✅ [Method 1] Found user ID in metadata.buyerUid: ${userId}`)
    } else {
      debugTrace.push("⚠️ [Method 1] metadata.buyerUid not found.")
    }

    // Method 2: Check client_reference_id (fallback)
    if (!userId && session.client_reference_id) {
      userId = session.client_reference_id
      debugTrace.push(`✅ [Method 2] Found user ID in client_reference_id: ${userId}`)
    } else if (!userId) {
      debugTrace.push("⚠️ [Method 2] client_reference_id not found.")
    }

    // Method 3: Look up user by email (last resort)
    if (!userId && session.customer_details?.email) {
      const email = session.customer_details.email
      debugTrace.push(`- [Method 3] Attempting to find user by email: ${email}`)

      try {
        const userRecord = await auth.getUserByEmail(email)
        userId = userRecord.uid
        debugTrace.push(`✅ [Method 3] Found user by email. User ID: ${userId}`)
      } catch (error) {
        const lookupError = `❌ [Method 3] Failed to find user by email: ${error instanceof Error ? error.message : "Unknown error"}`
        console.error(lookupError)
        debugTrace.push(lookupError)
        if (error instanceof Error && error.stack) {
          debugTrace.push(`Error stack: ${error.stack}`)
        }
      }
    } else if (!userId) {
      debugTrace.push("⚠️ [Method 3] No email found in session to look up user.")
    }

    // --- Final Check and Database Update ---
    if (!userId) {
      const finalError = "❌ Could not find user ID from any method."
      console.error(finalError, { session_id: session.id })
      debugTrace.push(finalError)
      return NextResponse.json({ error: "Could not find user ID", details: { debugTrace } }, { status: 400 })
    }

    debugTrace.push(`5. User identified successfully: ${userId}.`)
    debugTrace.push("6. Updating user data in Firestore...")

    try {
      // --- NEW: Update the 'memberships' collection using the new processor ---
      debugTrace.push("6a. Calling new membership processor...")
      // Ensure metadata has the correct key for the processor
      const sessionForProcessor = {
        ...session,
        metadata: { ...session.metadata, userId: userId, buyerUid: userId },
      }
      await processCheckoutSessionCompleted(sessionForProcessor)
      debugTrace.push("✅ New membership processor completed successfully.")

      // --- LEGACY: Update the 'users' collection (for backward compatibility) ---
      debugTrace.push("6b. Updating legacy 'users' collection...")
      const userRef = adminDb.collection("users").doc(userId)
      await userRef.update({
        plan: "creator_pro",
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        planStatus: "active",
        upgradedAt: new Date(),
      })
      debugTrace.push("✅ Legacy 'users' collection updated successfully.")
      console.log(`✅ Successfully upgraded user ${userId} to creator_pro.`)
    } catch (error) {
      const dbError = `❌ Failed to update user data in Firestore: ${error instanceof Error ? error.message : "Unknown error"}`
      console.error(dbError, { userId })
      debugTrace.push(dbError)
      if (error instanceof Error) {
        debugTrace.push(`Error name: ${error.name}`)
        debugTrace.push(`Error message: ${error.message}`)
        if (error.stack) {
          debugTrace.push(`Error stack: ${error.stack}`)
        }
      }
      return NextResponse.json(
        {
          error: "Failed to update user record.",
          details: {
            debugTrace,
            errorDetails: {
              name: error instanceof Error ? error.name : "Unknown",
              message: error instanceof Error ? error.message : "Unknown error",
              stack: error instanceof Error ? error.stack : null,
            },
          },
        },
        { status: 500 },
      )
    }
  } else {
    debugTrace.push(`- Received unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true, details: { debugTrace } })
}
