import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [Test Checkout] Starting test checkout creation")

    const { productBoxId, testMode } = await request.json()

    // Initialize Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      console.error("❌ [Test Checkout] Missing Stripe key")
      return NextResponse.json({ error: "Stripe configuration error" }, { status: 500 })
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-08-16" })

    // Create a test product and price
    const product = await stripe.products.create({
      name: "Test Product Box",
      description: "Test product for debugging checkout flow",
      metadata: {
        productBoxId: productBoxId || "test-product-box",
        type: "test_product",
      },
    })

    const price = await stripe.prices.create({
      currency: "usd",
      unit_amount: 500, // $5.00
      product: product.id,
      metadata: {
        productBoxId: productBoxId || "test-product-box",
        type: "test_price",
      },
    })

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/debug-stripe-session`,
      metadata: {
        productBoxId: productBoxId || "test-product-box",
        type: "test_purchase",
        testMode: "true",
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    })

    console.log("✅ [Test Checkout] Test session created:", {
      sessionId: session.id,
      productId: product.id,
      priceId: price.id,
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
      productId: product.id,
      priceId: price.id,
      amount: session.amount_total,
      currency: session.currency,
    })
  } catch (error) {
    console.error("❌ [Test Checkout] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
