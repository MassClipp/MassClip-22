import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Checkout API] Starting checkout for bundle: ${params.id}`)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      console.error("❌ [Checkout API] Authentication failed")
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

    // Parse request body
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

    const { successUrl, cancelUrl } = body

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
    })

    // Check if creator has Stripe account
    if (!creatorData?.stripeAccountId) {
      console.error(`❌ [Checkout API] Creator has no Stripe account: ${bundleData.creatorId}`)
      return NextResponse.json(
        {
          error: "Payment processing not available for this creator",
          code: "NO_STRIPE_ACCOUNT",
        },
        { status: 400 },
      )
    }

    // Create Stripe checkout session
    try {
      console.log(`🔄 [Checkout API] Creating Stripe checkout session`)

      const session = await stripe.checkout.sessions.create(
        {
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: bundleData.currency || "usd",
                product_data: {
                  name: bundleData.title,
                  description: bundleData.description || `Premium content by ${creatorData.username}`,
                  metadata: {
                    bundleId: params.id,
                    creatorId: bundleData.creatorId,
                  },
                },
                unit_amount: Math.round(bundleData.price * 100), // Convert to cents
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url:
            successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creatorData.username}`,
          metadata: {
            bundleId: params.id,
            buyerId: userId,
            creatorId: bundleData.creatorId,
          },
          payment_intent_data: {
            application_fee_amount: Math.round(bundleData.price * 100 * 0.05), // 5% platform fee
            metadata: {
              bundleId: params.id,
              buyerId: userId,
              creatorId: bundleData.creatorId,
            },
          },
        },
        {
          stripeAccount: creatorData.stripeAccountId,
        },
      )

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

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      )
    }

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
        hasStripeIntegration: !!(bundleData?.priceId && bundleData?.productId),
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
