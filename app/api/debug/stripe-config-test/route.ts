import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET() {
  try {
    // Test Stripe connection and get some basic info
    const products = await stripe.products.list({ limit: 10, active: true })
    const prices = await stripe.prices.list({ limit: 10, active: true })

    return NextResponse.json({
      success: true,
      message: "Stripe configuration verified",
      data: {
        productsCount: products.data.length,
        pricesCount: prices.data.length,
        availablePrices: prices.data.map((price) => ({
          id: price.id,
          product: price.product,
          amount: price.unit_amount,
          currency: price.currency,
          type: price.type,
        })),
        environment: process.env.NODE_ENV,
        stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
      },
      timestamp: new Date().toISOString(),
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
