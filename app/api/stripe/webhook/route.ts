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
      { error: "Webhook signature verification failed.", details: { debugTrace } },
      { status: 400 },
    )
  }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    debugTrace.push("2. Received checkout.session.completed event.")
    debugTrace.push(`- Session ID: ${session.id}`)

    let userId: string | null = null

    // --- User Identification Logic ---
    debugTrace.push("3. Starting user identification process...")

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

      if (!isFirebaseAdminInitialized()) {
        const firebaseError = "❌ [Method 3] Firebase Admin SDK is not initialized. Cannot look up user by email."
        console.error(firebaseError)
        debugTrace.push(firebaseError)
      } else {
        try {
          const userRecord = await auth.getUserByEmail(email)
          userId = userRecord.uid
          debugTrace.push(`✅ [Method 3] Found user by email. User ID: ${userId}`)
        } catch (error) {
          const lookupError = `❌ [Method 3] Failed to find user by email: ${error instanceof Error ? error.message : "Unknown error"}`
          console.error(lookupError)
          debugTrace.push(lookupError)
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

    debugTrace.push(`4. User identified successfully: ${userId}.`)
    debugTrace.push("5. Updating user data in Firestore...")

    try {
      // --- NEW: Update the 'memberships' collection using the new processor ---
      debugTrace.push("5a. Calling new membership processor...")
      // Ensure metadata has the correct key for the processor
      const sessionForProcessor = {
        ...session,
        metadata: { ...session.metadata, userId: userId, buyerUid: userId },
      }
      await processCheckoutSessionCompleted(sessionForProcessor)
      debugTrace.push("✅ New membership processor completed successfully.")

      // --- LEGACY: Update the 'users' collection (for backward compatibility) ---
      debugTrace.push("5b. Updating legacy 'users' collection...")
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
      return NextResponse.json({ error: "Failed to update user record.", details: { debugTrace } }, { status: 500 })
    }
  } else {
    debugTrace.push(`- Received unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true, details: { debugTrace } })
}
