import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, auth, db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  const debugMode = request.headers.get("x-debug-mode") === "true"
  const isDebug = debugMode

  if (debugMode) {
    console.log("🔍 [Checkout Debug] Starting checkout session creation in debug mode")
  }

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    const body = await request.json()
    const { idToken, priceId, bundleId, successUrl, cancelUrl, debugMode: bodyDebugMode } = body

    if (isDebug || bodyDebugMode) {
      console.log("🔍 [Checkout Debug] Request body:", {
        hasIdToken: !!idToken,
        idTokenLength: idToken?.length,
        priceId,
        bundleId,
        successUrl,
        cancelUrl,
        debugMode: isDebug || bodyDebugMode,
      })

      console.log("🔍 [Checkout Debug] Request headers:", {
        authorization: request.headers.get("authorization") ? "Present" : "Missing",
        contentType: request.headers.get("content-type"),
        userAgent: request.headers.get("user-agent"),
      })
    }

    // Validate required fields
    if (!idToken) {
      console.error("❌ [Checkout] No ID token provided")
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "idToken is required",
          debugInfo: isDebug ? { receivedFields: Object.keys(body) } : undefined,
        },
        { status: 401 },
      )
    }

    if (!priceId) {
      console.error("❌ [Checkout] No price ID provided")
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 })
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      if (isDebug) {
        console.log("🔍 [Checkout Debug] Verifying Firebase ID token")
      }

      decodedToken = await auth.verifyIdToken(idToken)

      if (isDebug) {
        console.log("✅ [Checkout Debug] Token verified successfully:", {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
          authTime: decodedToken.auth_time,
          exp: decodedToken.exp,
          iat: decodedToken.iat,
        })
      }
    } catch (error: any) {
      console.error("❌ [Checkout] Token verification failed:", error)
      return NextResponse.json(
        {
          error: "Invalid authentication token",
          details: error.message,
          code: error.code,
          debugInfo: isDebug
            ? {
                tokenLength: idToken?.length,
                tokenFormat: idToken?.split(".").length === 3 ? "Valid JWT format" : "Invalid JWT format",
                errorStack: error.stack,
              }
            : undefined,
        },
        { status: 401 },
      )
    }

    const userUid = decodedToken.uid
    const userEmail = decodedToken.email

    if (isDebug) {
      console.log("🔍 [Checkout Debug] Authenticated user:", { userUid, userEmail })
    }

    // Check if user has a Stripe customer ID
    let customerId: string | null = null

    try {
      const userDoc = await db.collection("users").doc(userUid).get()

      if (userDoc.exists) {
        const userData = userDoc.data()
        customerId = userData?.stripeCustomerId || null

        if (isDebug) {
          console.log("🔍 [Checkout Debug] User profile found:", {
            hasStripeCustomerId: !!customerId,
            customerId: customerId ? `${customerId.substring(0, 8)}...` : null,
          })
        }
      } else {
        if (isDebug) {
          console.log("🔍 [Checkout Debug] User profile not found in Firestore")
        }
      }
    } catch (firestoreError: any) {
      console.error("❌ [Checkout] Firestore error:", firestoreError)
      if (isDebug) {
        console.log("🔍 [Checkout Debug] Continuing without user profile due to Firestore error")
      }
    }

    // Create or retrieve Stripe customer
    if (!customerId && userEmail) {
      try {
        if (isDebug) {
          console.log("🔍 [Checkout Debug] Creating new Stripe customer")
        }

        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            firebaseUid: userUid,
          },
        })

        customerId = customer.id

        if (isDebug) {
          console.log("✅ [Checkout Debug] Stripe customer created:", customerId)
        }

        // Save customer ID to user profile
        try {
          await db.collection("users").doc(userUid).set({ stripeCustomerId: customerId }, { merge: true })

          if (isDebug) {
            console.log("✅ [Checkout Debug] Customer ID saved to user profile")
          }
        } catch (saveError: any) {
          console.error("❌ [Checkout] Failed to save customer ID:", saveError)
          // Continue anyway - not critical for checkout
        }
      } catch (stripeError: any) {
        console.error("❌ [Checkout] Failed to create Stripe customer:", stripeError)
        return NextResponse.json(
          {
            error: "Failed to create customer",
            details: stripeError.message,
            debugInfo: isDebug ? { stripeError: stripeError.type } : undefined,
          },
          { status: 500 },
        )
      }
    }

    // Create checkout session
    try {
      if (isDebug) {
        console.log("🔍 [Checkout Debug] Creating Stripe checkout session")
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId || undefined,
        customer_email: !customerId ? userEmail : undefined,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          firebaseUid: userUid,
          bundleId: bundleId || "",
          createdAt: new Date().toISOString(),
        },
        payment_intent_data: {
          metadata: {
            firebaseUid: userUid,
            bundleId: bundleId || "",
          },
        },
      }

      if (isDebug) {
        console.log("🔍 [Checkout Debug] Session parameters:", {
          hasCustomer: !!sessionParams.customer,
          hasCustomerEmail: !!sessionParams.customer_email,
          priceId: sessionParams.line_items?.[0]?.price,
          mode: sessionParams.mode,
          metadataKeys: Object.keys(sessionParams.metadata || {}),
        })
      }

      const session = await stripe.checkout.sessions.create(sessionParams)

      if (isDebug) {
        console.log("✅ [Checkout Debug] Checkout session created:", {
          sessionId: session.id,
          url: session.url ? "Generated" : "Missing",
          status: session.status,
          paymentStatus: session.payment_status,
        })
      }

      return NextResponse.json({
        sessionId: session.id,
        url: session.url,
        buyerUid: userUid,
        customerId,
        debugInfo: isDebug
          ? {
              sessionStatus: session.status,
              paymentStatus: session.payment_status,
              mode: session.mode,
              currency: session.currency,
              amountTotal: session.amount_total,
            }
          : undefined,
      })
    } catch (stripeError: any) {
      console.error("❌ [Checkout] Stripe checkout session creation failed:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to create checkout session",
          details: stripeError.message,
          type: stripeError.type,
          debugInfo: isDebug
            ? {
                stripeErrorCode: stripeError.code,
                stripeErrorType: stripeError.type,
                stripeErrorParam: stripeError.param,
              }
            : undefined,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Checkout] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        debugInfo: isDebug
          ? {
              errorStack: error.stack,
              errorName: error.name,
            }
          : undefined,
      },
      { status: 500 },
    )
  }
}
