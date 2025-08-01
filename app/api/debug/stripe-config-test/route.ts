import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET() {
  try {
    // Test Stripe connection by listing a few prices
    const prices = await stripe.prices.list({ limit: 3 })

    // Check if the test price ID exists
    const testPriceId = "price_1QCqGhP8mGrl6RNHK8tJYqzV"
    let testPrice = null
    try {
      testPrice = await stripe.prices.retrieve(testPriceId)
    } catch (error) {
      // Price doesn't exist, that's okay
    }

    return NextResponse.json({
      success: true,
      message: "Stripe configuration verified",
      data: {
        stripeConnected: true,
        pricesCount: prices.data.length,
        testPriceExists: !!testPrice,
        testPriceId,
        testPriceDetails: testPrice
          ? {
              id: testPrice.id,
              amount: testPrice.unit_amount,
              currency: testPrice.currency,
              active: testPrice.active,
            }
          : null,
        environment: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
      },
    })
  } catch (error: any) {
    console.error("Stripe config test error:", error)
    return NextResponse.json(
      {
        error: "Stripe configuration failed",
        details: error.message,
        type: error.type,
      },
      { status: 500 },
    )
  }
}
