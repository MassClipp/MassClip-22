import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [Test Checkout] Starting checkout creation test")

    const { productBoxId, testMode } = await request.json()

    // Initialize Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      console.error("❌ [Test Checkout] Missing Stripe key")
      return NextResponse.json({
        success: false,
        error: "Stripe configuration error: Missing secret key",
      })
    }

    console.log("🔑 [Test Checkout] Stripe config:", {
      keyType: stripeKey.startsWith("sk_test_") ? "test" : "live",
      hasKey: !!stripeKey,
    })

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-08-16" })

    // Test product data
    const testProductData = {
      title: "Test Product Box",
      description: "Test product for checkout debugging",
      price: 4.99,
      thumbnailUrl: "https://via.placeholder.com/300x200",
    }

    console.log("📦 [Test Checkout] Creating test session with data:", testProductData)

    // Create or get Stripe price
    let priceId: string

    try {
      // First, try to create a product
      const product = await stripe.products.create({
        name: testProductData.title,
        description: testProductData.description,
        images: testProductData.thumbnailUrl ? [testProductData.thumbnailUrl] : [],
        metadata: {
          productBoxId: productBoxId || "test-product-box",
          type: "product_box",
          testMode: testMode ? "true" : "false",
        },
      })

      console.log("✅ [Test Checkout] Product created:", product.id)

      // Create a price for the product
      const price = await stripe.prices.create({
        currency: "usd",
        unit_amount: Math.round(testProductData.price * 100), // Convert to cents
        product: product.id,
        metadata: {
          productBoxId: productBoxId || "test-product-box",
          type: "product_box_price",
        },
      })

      priceId = price.id
      console.log("✅ [Test Checkout] Price created:", priceId)
    } catch (productError) {
      console.error("❌ [Test Checkout] Product/Price creation failed:", productError)
      return NextResponse.json({
        success: false,
        error: `Failed to create product/price: ${productError instanceof Error ? productError.message : "Unknown error"}`,
        details: productError,
      })
    }

    // Create checkout session with the dynamic price
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/debug-stripe-session`,
        metadata: {
          productBoxId: productBoxId || "test-product-box",
          buyerUid: "test-user",
          creatorUid: "test-creator",
          type: "product_box_purchase_test",
          testMode: testMode ? "true" : "false",
        },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
      })

      console.log("✅ [Test Checkout] Session created successfully:", {
        sessionId: session.id,
        url: session.url,
        amount: session.amount_total,
        currency: session.currency,
        expires_at: session.expires_at ? new Date(session.expires_at * 1000) : null,
      })

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        checkoutUrl: session.url,
        amount: session.amount_total,
        currency: session.currency,
        expiresAt: session.expires_at,
        priceId,
        productId: session.metadata?.productId,
        details: {
          testProductData,
          stripeKeyType: stripeKey.startsWith("sk_test_") ? "test" : "live",
        },
      })
    } catch (sessionError) {
      console.error("❌ [Test Checkout] Session creation failed:", sessionError)
      return NextResponse.json({
        success: false,
        error: `Failed to create checkout session: ${sessionError instanceof Error ? sessionError.message : "Unknown error"}`,
        details: sessionError,
      })
    }
  } catch (error) {
    console.error("❌ [Test Checkout] Unexpected error:", error)
    return NextResponse.json({
      success: false,
      error: "Unexpected error during checkout test",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
