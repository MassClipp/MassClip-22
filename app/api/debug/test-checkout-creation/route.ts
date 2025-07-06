import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [Test Checkout] Starting test checkout creation")

    const { productBoxId, price = 9.99 } = await request.json()

    // Initialize Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      console.error("❌ [Test Checkout] Missing Stripe key")
      return NextResponse.json({ error: "Stripe configuration error" }, { status: 500 })
    }

    console.log("🔑 [Test Checkout] Stripe config:", {
      keyType: stripeKey.startsWith("sk_test_") ? "test" : "live",
      hasKey: !!stripeKey,
    })

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-08-16" })

    // Create a test product
    const product = await stripe.products.create({
      name: "Test Product Box",
      description: "Test checkout creation",
      metadata: {
        productBoxId: productBoxId || "test-product-box",
        type: "test_product_box",
      },
    })

    console.log("✅ [Test Checkout] Test product created:", product.id)

    // Create a test price
    const priceObj = await stripe.prices.create({
      currency: "usd",
      unit_amount: Math.round(price * 100), // Convert to cents
      product: product.id,
      metadata: {
        productBoxId: productBoxId || "test-product-box",
        type: "test_product_box_price",
      },
    })

    console.log("✅ [Test Checkout] Test price created:", priceObj.id)

    // Create test checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceObj.id,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/debug-stripe-session`,
      metadata: {
        productBoxId: productBoxId || "test-product-box",
        buyerUid: "test-user",
        type: "test_product_box_purchase",
        priceId: priceObj.id,
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    })

    console.log("✅ [Test Checkout] Test session created:", {
      sessionId: session.id,
      url: session.url,
      amount: session.amount_total,
      currency: session.currency,
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
      productId: product.id,
      priceId: priceObj.id,
      amount: session.amount_total,
      currency: session.currency,
      expiresAt: session.expires_at,
    })
  } catch (error) {
    console.error("❌ [Test Checkout] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to create test checkout session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
