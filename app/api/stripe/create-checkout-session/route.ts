import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode, createCheckoutSessionWithAccount } from "@/lib/stripe"
import { db, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { idToken, productBoxId, priceInCents, returnUrl } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify Firebase token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Checkout] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`💳 [Checkout] Creating session for user: ${userId} (${isTestMode ? "TEST" : "LIVE"} mode)`)

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const productBox = productBoxDoc.data()!
    const creatorId = productBox.creatorId

    // Get creator's connected account
    const creatorDoc = await db.collection("users").doc(creatorId).get()
    if (!creatorDoc.exists) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()!
    const connectedAccountId = isTestMode ? creatorData.stripeTestAccountId : creatorData.stripeAccountId

    if (!connectedAccountId) {
      console.error(`❌ [Checkout] Creator ${creatorId} has no connected Stripe account`)
      return NextResponse.json({ error: "Creator payment setup incomplete" }, { status: 400 })
    }

    // Verify connected account is active
    try {
      const account = await stripe.accounts.retrieve(connectedAccountId)
      if (!account.charges_enabled) {
        return NextResponse.json({ error: "Creator account not ready to accept payments" }, { status: 400 })
      }
    } catch (error) {
      console.error(`❌ [Checkout] Connected account ${connectedAccountId} verification failed:`, error)
      return NextResponse.json({ error: "Creator payment setup invalid" }, { status: 400 })
    }

    // Calculate application fee (25% platform fee)
    const applicationFeeAmount = Math.round(priceInCents * 0.25)

    console.log(`💰 [Checkout] Price: $${priceInCents / 100}, Platform fee: $${applicationFeeAmount / 100}`)

    // Create checkout session with connected account
    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBox.title || "Premium Content Bundle",
              description: productBox.description || "Access to premium content",
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/product-box/${productBoxId}`,
      metadata: {
        userId,
        productBoxId,
        creatorId,
        connectedAccountId,
        environment: isTestMode ? "test" : "live",
      },
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        metadata: {
          userId,
          productBoxId,
          creatorId,
          connectedAccountId,
        },
      },
    }

    const session = await createCheckoutSessionWithAccount(sessionParams, connectedAccountId)

    console.log(`✅ [Checkout] Created session: ${session.id} for connected account: ${connectedAccountId}`)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      connectedAccountId,
      mode: isTestMode ? "test" : "live",
    })
  } catch (error: any) {
    console.error("❌ [Checkout] Session creation failed:", error)
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
