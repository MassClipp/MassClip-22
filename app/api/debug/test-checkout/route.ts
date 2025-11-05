import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [Test Checkout] Starting simple Stripe test...")

    // Test 1: Basic Stripe initialization
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY not found")
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    })

    console.log("✅ [Test Checkout] Stripe initialized successfully")

    // Test 2: Create a simple test product and price
    try {
      const testProduct = await stripe.products.create({
        name: `Test Product ${Date.now()}`,
        description: "A test product for checkout validation",
      })

      console.log("✅ [Test Checkout] Test product created:", testProduct.id)

      const testPrice = await stripe.prices.create({
        product: testProduct.id,
        unit_amount: 100, // $1.00
        currency: "usd",
      })

      console.log("✅ [Test Checkout] Test price created:", testPrice.id)

      // Test 3: Create a simple checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: testPrice.id,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      })

      console.log("✅ [Test Checkout] Test session created:", session.id)

      // Clean up test data - Archive instead of delete
      try {
        await stripe.products.update(testProduct.id, { active: false })
        console.log("✅ [Test Checkout] Test product archived (not deleted to avoid price conflict)")
      } catch (cleanupError) {
        console.log("⚠️ [Test Checkout] Could not archive test product, but test still passed")
      }

      return NextResponse.json({
        success: true,
        message: "Stripe checkout test passed",
        sessionId: session.id,
        sessionUrl: session.url,
        testProductId: testProduct.id,
        testPriceId: testPrice.id,
      })
    } catch (stripeError) {
      console.error("❌ [Test Checkout] Stripe API error:", stripeError)

      // Check if it's a specific Stripe error
      if (stripeError instanceof Error) {
        if (stripeError.message.includes("Invalid API Key")) {
          return NextResponse.json(
            {
              error: "Invalid Stripe API Key",
              details: "The Stripe secret key appears to be invalid or expired",
              suggestion: "Check your STRIPE_SECRET_KEY environment variable",
            },
            { status: 500 },
          )
        }

        if (stripeError.message.includes("No such")) {
          return NextResponse.json(
            {
              error: "Stripe Resource Not Found",
              details: stripeError.message,
              suggestion: "This might be a test vs live mode mismatch",
            },
            { status: 500 },
          )
        }
      }

      return NextResponse.json(
        {
          error: "Stripe API test failed",
          details: stripeError instanceof Error ? stripeError.message : "Unknown Stripe error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Test Checkout] General error:", error)
    return NextResponse.json(
      {
        error: "Test checkout failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
