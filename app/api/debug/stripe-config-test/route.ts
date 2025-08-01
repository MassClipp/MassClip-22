import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET() {
  try {
    console.log("🔍 [Stripe Config] Testing Stripe configuration...")

    // Test Stripe connection by listing prices
    const prices = await stripe.prices.list({
      limit: 10,
      active: true,
    })

    console.log("✅ [Stripe Config] Stripe connection successful")

    return NextResponse.json({
      success: true,
      message: "Stripe configuration verified",
      data: {
        pricesCount: prices.data.length,
        availablePrices: prices.data.map((price) => ({
          id: price.id,
          amount: price.unit_amount,
          currency: price.currency,
          product: price.product,
          active: price.active,
        })),
        stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
      },
    })
  } catch (error: any) {
    console.error("❌ [Stripe Config] Stripe configuration failed:", error)

    return NextResponse.json(
      {
        error: "Stripe configuration failed",
        details: error.message,
        type: error.type,
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) + "...",
      },
      { status: 500 },
    )
  }
}
