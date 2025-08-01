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
    const { priceId, bundleId, successUrl, cancelUrl } = body

    // Extract token from Authorization header
    const authHeader = request.headers.get("authorization")
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null

    // Check Stripe mode
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY!
    const isTestMode = stripeSecretKey.startsWith("sk_test_")
    const isLiveMode = stripeSecretKey.startsWith("sk_live_")

    if (debugMode) {
      console.log("🔍 [Checkout Debug] Request received:", {
        hasAuthHeader: !!authHeader,
        hasIdToken: !!idToken,
        idTokenLength: idToken?.length,
        priceId,
        bundleId,
        stripeMode: isTestMode ? "test" : isLiveMode ? "live" : "unknown",
        stripeKeyPrefix: stripeSecretKey.substring(0, 8) + "...",
      })
    }

    // Validate authentication
    if (!idToken) {
      console.error("❌ [Checkout] Missing ID token")
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "No valid Bearer token found in Authorization header",
        },
        { status: 401 },
      )
    }

    // Validate price ID
    if (!priceId) {
      console.error("❌ [Checkout] Missing price ID")
      return NextResponse.json(
        {
          error: "Price ID is required",
          details: "priceId field is missing or empty",
        },
        { status: 400 },
      )
    }

    // Verify the price exists in Stripe
    let priceData
    try {
      if (debugMode) {
        console.log(`🔍 [Checkout Debug] Verifying price ${priceId} in ${isTestMode ? "test" : "live"} mode...`)
      }

      priceData = await stripe.prices.retrieve(priceId)

      if (debugMode) {
        console.log("✅ [Checkout Debug] Price verified:", {
          id: priceData.id,
          amount: priceData.unit_amount,
          currency: priceData.currency,
          active: priceData.active,
          product: priceData.product,
          stripeMode: isTestMode ? "test" : "live",
        })
      }
    } catch (stripeError: any) {
      console.error("❌ [Checkout] Price verification failed:", stripeError.message)

      // Enhanced error for mode mismatch
      let modeHint = ""
      if (stripeError.code === "resource_missing") {
        modeHint = isTestMode
          ? " (You're in TEST mode - make sure this is a test price ID starting with price_test_ or created in test mode)"
          : " (You're in LIVE mode - make sure this is a live price ID created in live mode)"
      }

      return NextResponse.json(
        {
          error: "Invalid price ID",
          details: stripeError.message + modeHint,
          priceId,
          stripeMode: isTestMode ? "test" : isLiveMode ? "live" : "unknown",
          stripeErrorCode: stripeError.code,
          hint: isTestMode
            ? "In test mode, use price IDs created in your Stripe test dashboard"
            : "In live mode, use price IDs created in your Stripe live dashboard",
        },
        { status: 400 },
      )
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      if (debugMode) {
        console.log("🔍 [Checkout Debug] Verifying Firebase token...")
      }

      decodedToken = await auth.verifyIdToken(idToken)

      if (debugMode) {
        console.log("✅ [Checkout Debug] Token verified:", {
          uid: decodedToken.uid,
          email: decodedToken.email,
        })
      }
    } catch (error: any) {
      console.error("❌ [Checkout] Token verification failed:", error)
      return NextResponse.json(
        {
          error: "Invalid authentication token",
          details: error.message,
        },
        { status: 401 },
      )
    }

    const userUid = decodedToken.uid
    const userEmail = decodedToken.email

    // Get or create Stripe customer
    let customerId: string | null = null

    try {
      const userDoc = await db.collection("users").doc(userUid).get()
      if (userDoc.exists) {
        customerId = userDoc.data()?.stripeCustomerId || null
      }
    } catch (firestoreError: any) {
      console.error("❌ [Checkout] Firestore error:", firestoreError)
    }

    // Create Stripe customer if needed
    if (!customerId && userEmail) {
      try {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { firebaseUid: userUid },
        })
        customerId = customer.id

        // Save customer ID
        try {
          await db.collection("users").doc(userUid).set({ stripeCustomerId: customerId }, { merge: true })
        } catch (saveError: any) {
          console.error("❌ [Checkout] Failed to save customer ID:", saveError)
        }

        if (debugMode) {
          console.log("✅ [Checkout Debug] Created Stripe customer:", customerId)
        }
      } catch (stripeError: any) {
        console.error("❌ [Checkout] Failed to create customer:", stripeError)
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
        console.log("🔍 [Checkout Debug] Creating checkout session...")
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId || undefined,
        customer_email: !customerId ? userEmail : undefined,
        line_items: [{ price: priceId, quantity: 1 }],
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
      })

      if (debugMode) {
        console.log("✅ [Checkout Debug] Session created:", {
          sessionId: session.id,
          hasUrl: !!session.url,
          stripeMode: isTestMode ? "test" : "live",
        })
      }

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        url: session.url,
        buyerUid: userUid,
        customerId,
        priceId,
        bundleId,
        stripeMode: isTestMode ? "test" : isLiveMode ? "live" : "unknown",
      })
    } catch (stripeError: any) {
      console.error("❌ [Checkout] Session creation failed:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to create checkout session",
          details: stripeError.message,
          stripeErrorCode: stripeError.code,
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
