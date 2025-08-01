import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, auth, db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  const debugMode = request.headers.get("x-debug-mode") === "true"

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    const body = await request.json()
    const { idToken, priceId, bundleId, successUrl, cancelUrl } = body

    if (debugMode) {
      console.log("🔍 [Checkout Debug] Request received:", {
        hasIdToken: !!idToken,
        idTokenLength: idToken?.length,
        priceId,
        bundleId,
        successUrl,
        cancelUrl,
        bodyKeys: Object.keys(body),
      })
    }

    // Validate required fields
    if (!idToken) {
      console.error("❌ [Checkout] Missing ID token")
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "idToken is required",
          received: Object.keys(body),
        },
        { status: 401 },
      )
    }

    if (!priceId) {
      console.error("❌ [Checkout] Missing price ID")
      return NextResponse.json(
        {
          error: "Price ID is required",
          details: "priceId field is missing or empty",
          received: { priceId, hasIdToken: !!idToken, bundleId },
        },
        { status: 400 },
      )
    }

    if (debugMode) {
      console.log("🔍 [Checkout Debug] Validating price ID with Stripe...")
    }

    // Verify the price exists in Stripe
    let priceData
    try {
      priceData = await stripe.prices.retrieve(priceId)
      if (debugMode) {
        console.log("✅ [Checkout Debug] Price found:", {
          id: priceData.id,
          amount: priceData.unit_amount,
          currency: priceData.currency,
          product: priceData.product,
        })
      }
    } catch (stripeError: any) {
      console.error("❌ [Checkout] Invalid price ID:", stripeError.message)
      return NextResponse.json(
        {
          error: "Invalid price ID",
          details: stripeError.message,
          priceId,
        },
        { status: 400 },
      )
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      if (debugMode) {
        console.log("🔍 [Checkout Debug] Verifying Firebase ID token...")
      }

      decodedToken = await auth.verifyIdToken(idToken)

      if (debugMode) {
        console.log("✅ [Checkout Debug] Token verified:", {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
        })
      }
    } catch (error: any) {
      console.error("❌ [Checkout] Token verification failed:", error)
      return NextResponse.json(
        {
          error: "Invalid authentication token",
          details: error.message,
          code: error.code,
        },
        { status: 401 },
      )
    }

    const userUid = decodedToken.uid
    const userEmail = decodedToken.email

    // Check if user has a Stripe customer ID
    let customerId: string | null = null

    try {
      const userDoc = await db.collection("users").doc(userUid).get()

      if (userDoc.exists) {
        const userData = userDoc.data()
        customerId = userData?.stripeCustomerId || null

        if (debugMode) {
          console.log("🔍 [Checkout Debug] User profile found:", {
            hasStripeCustomerId: !!customerId,
          })
        }
      }
    } catch (firestoreError: any) {
      console.error("❌ [Checkout] Firestore error:", firestoreError)
      // Continue without user profile - not critical for checkout
    }

    // Create or retrieve Stripe customer
    if (!customerId && userEmail) {
      try {
        if (debugMode) {
          console.log("🔍 [Checkout Debug] Creating new Stripe customer...")
        }

        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            firebaseUid: userUid,
          },
        })

        customerId = customer.id

        if (debugMode) {
          console.log("✅ [Checkout Debug] Stripe customer created:", customerId)
        }

        // Save customer ID to user profile
        try {
          await db.collection("users").doc(userUid).set({ stripeCustomerId: customerId }, { merge: true })
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
          },
          { status: 500 },
        )
      }
    }

    // Create checkout session
    try {
      if (debugMode) {
        console.log("🔍 [Checkout Debug] Creating Stripe checkout session...")
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
        success_url: successUrl || `${request.nextUrl.origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || request.nextUrl.origin,
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

      if (debugMode) {
        console.log("🔍 [Checkout Debug] Session parameters:", {
          hasCustomer: !!sessionParams.customer,
          hasCustomerEmail: !!sessionParams.customer_email,
          priceId: sessionParams.line_items?.[0]?.price,
          mode: sessionParams.mode,
          metadataKeys: Object.keys(sessionParams.metadata || {}),
        })
      }

      const session = await stripe.checkout.sessions.create(sessionParams)

      if (debugMode) {
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
        priceId,
        bundleId,
        debugInfo: debugMode
          ? {
              sessionStatus: session.status,
              paymentStatus: session.payment_status,
              mode: session.mode,
              currency: session.currency,
              amountTotal: session.amount_total,
              priceVerified: true,
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
          priceId,
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
      },
      { status: 500 },
    )
  }
}
