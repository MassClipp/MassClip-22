import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"
import type Stripe from "stripe"

// Helper function to verify auth token from headers
async function verifyAuthToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.substring(7)
    const { auth } = await import("@/lib/firebase-admin")
    const decodedToken = await auth.verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("❌ [Auth] Token verification failed:", error)
    return null
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Checkout API] Starting checkout for bundle: ${params.id}`)

    // Parse request body first
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("❌ [Checkout API] Failed to parse request body:", parseError)
      return NextResponse.json(
        {
          error: "Invalid request body",
          code: "INVALID_REQUEST_BODY",
        },
        { status: 400 },
      )
    }

    const { successUrl, cancelUrl, userToken } = body

    // Verify authentication - try multiple methods
    let decodedToken = null

    // Method 1: From Authorization header
    decodedToken = await verifyAuthToken(request)

    // Method 2: From request body token
    if (!decodedToken && userToken) {
      try {
        const { auth } = await import("@/lib/firebase-admin")
        decodedToken = await auth.verifyIdToken(userToken)
      } catch (error) {
        console.error("❌ [Checkout API] Body token verification failed:", error)
      }
    }

    if (!decodedToken) {
      console.error("❌ [Checkout API] Authentication failed - no valid token found")
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    console.log(`✅ [Checkout API] User authenticated: ${userId}`)

    // Get bundle data - try productBoxes collection first
    let bundleDoc = await db.collection("productBoxes").doc(params.id).get()

    if (!bundleDoc.exists) {
      // Fallback to bundles collection
      bundleDoc = await db.collection("bundles").doc(params.id).get()
    }

    if (!bundleDoc.exists) {
      console.error(`❌ [Checkout API] Bundle not found: ${params.id}`)
      return NextResponse.json(
        {
          error: "Bundle not found",
          code: "BUNDLE_NOT_FOUND",
        },
        { status: 404 },
      )
    }

    const bundleData = bundleDoc.data()
    console.log(`✅ [Checkout API] Bundle found:`, {
      title: bundleData?.title,
      price: bundleData?.price,
      creatorId: bundleData?.creatorId,
      active: bundleData?.active,
    })

    // Validate bundle data
    if (!bundleData?.active) {
      console.error(`❌ [Checkout API] Bundle is inactive: ${params.id}`)
      return NextResponse.json(
        {
          error: "This bundle is currently unavailable",
          code: "BUNDLE_INACTIVE",
        },
        { status: 400 },
      )
    }

    if (!bundleData?.price || bundleData.price <= 0) {
      console.error(`❌ [Checkout API] Invalid bundle price: ${bundleData?.price}`)
      return NextResponse.json(
        {
          error: "Invalid bundle pricing",
          code: "INVALID_PRICE",
        },
        { status: 400 },
      )
    }

    // Get creator data
    const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
    if (!creatorDoc.exists) {
      console.error(`❌ [Checkout API] Creator not found: ${bundleData.creatorId}`)
      return NextResponse.json(
        {
          error: "Creator not found",
          code: "CREATOR_NOT_FOUND",
        },
        { status: 404 },
      )
    }

    const creatorData = creatorDoc.data()
    console.log(`✅ [Checkout API] Creator found:`, {
      username: creatorData?.username,
      hasStripeAccount: !!creatorData?.stripeAccountId,
      onboardingComplete: creatorData?.stripeOnboardingComplete,
    })

    // Check if creator has Stripe account and is onboarded
    if (!creatorData?.stripeAccountId || !creatorData?.stripeOnboardingComplete) {
      console.error(`❌ [Checkout API] Creator not ready for payments: ${bundleData.creatorId}`)
      return NextResponse.json(
        {
          error: "Payment processing not available for this creator",
          code: "NO_STRIPE_ACCOUNT",
        },
        { status: 400 },
      )
    }

    // Check if user already owns this bundle
    const existingPurchase = await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .where("productBoxId", "==", params.id)
      .limit(1)
      .get()

    if (!existingPurchase.empty) {
      console.error(`❌ [Checkout API] User already owns bundle: ${params.id}`)
      return NextResponse.json(
        {
          error: "You already own this bundle",
          code: "ALREADY_PURCHASED",
        },
        { status: 400 },
      )
    }

    // Create Stripe checkout session
    try {
      console.log(`🔄 [Checkout API] Creating Stripe checkout session`)

      const priceInCents = Math.round(bundleData.price * 100) // Convert to cents
      const platformFeeAmount = Math.round(priceInCents * 0.05) // 5% platform fee

      // Use environment-appropriate URLs
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "http://localhost:3000"
      const defaultSuccessUrl = `${baseUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`
      const defaultCancelUrl = `${baseUrl}/creator/${creatorData.username}`

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: bundleData.currency || "usd",
              product_data: {
                name: bundleData.title,
                description: bundleData.description || `Premium content by ${creatorData.username}`,
                images: bundleData.thumbnailUrl ? [bundleData.thumbnailUrl] : undefined,
                metadata: {
                  bundleId: params.id,
                  creatorId: bundleData.creatorId,
                },
              },
              unit_amount: priceInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl || defaultSuccessUrl,
        cancel_url: cancelUrl || defaultCancelUrl,
        client_reference_id: userId,
        metadata: {
          productBoxId: params.id,
          buyerUid: userId,
          creatorUid: bundleData.creatorId,
          bundleTitle: bundleData.title,
        },
        payment_intent_data: {
          application_fee_amount: platformFeeAmount,
          metadata: {
            productBoxId: params.id,
            buyerUid: userId,
            creatorUid: bundleData.creatorId,
          },
        },
      }

      console.log("📝 [Checkout API] Session metadata:", sessionParams.metadata)
      console.log("🔗 [Checkout API] Connected account:", creatorData.stripeAccountId)

      // Create session on the connected account
      const session = await stripe.checkout.sessions.create(sessionParams, {
        stripeAccount: creatorData.stripeAccountId,
      })

      console.log(`✅ [Checkout API] Stripe session created: ${session.id}`)

      // Log the checkout attempt
      await db.collection("checkoutAttempts").add({
        bundleId: params.id,
        buyerId: userId,
        creatorId: bundleData.creatorId,
        sessionId: session.id,
        amount: bundleData.price,
        currency: bundleData.currency || "usd",
        status: "created",
        stripeAccount: creatorData.stripeAccountId,
        createdAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        url: session.url,
        bundle: {
          id: params.id,
          title: bundleData.title,
          price: bundleData.price,
          currency: bundleData.currency || "usd",
        },
        creator: {
          id: bundleData.creatorId,
          username: creatorData.username,
        },
      })
    } catch (stripeError: any) {
      console.error(`❌ [Checkout API] Stripe checkout session creation failed:`, stripeError)
      return NextResponse.json(
        {
          error: "Failed to create checkout session",
          code: "CHECKOUT_CREATION_FAILED",
          details: stripeError.message || "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error(`❌ [Checkout API] Unexpected error:`, error)
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Checkout API] GET request for bundle: ${params.id}`)

    // Get bundle data
    let bundleDoc = await db.collection("productBoxes").doc(params.id).get()

    if (!bundleDoc.exists) {
      bundleDoc = await db.collection("bundles").doc(params.id).get()
    }

    if (!bundleDoc.exists) {
      return NextResponse.json(
        {
          error: "Bundle not found",
          code: "BUNDLE_NOT_FOUND",
        },
        { status: 404 },
      )
    }

    const bundleData = bundleDoc.data()

    // Get creator data to check Stripe status
    const creatorDoc = await db.collection("users").doc(bundleData?.creatorId).get()
    const creatorData = creatorDoc.data()

    return NextResponse.json({
      success: true,
      bundle: {
        id: params.id,
        title: bundleData?.title,
        description: bundleData?.description,
        price: bundleData?.price,
        currency: bundleData?.currency || "usd",
        active: bundleData?.active,
        creatorId: bundleData?.creatorId,
        hasStripeIntegration: !!(creatorData?.stripeAccountId && creatorData?.stripeOnboardingComplete),
      },
    })
  } catch (error: any) {
    console.error(`❌ [Checkout API] GET error:`, error)
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    )
  }
}
