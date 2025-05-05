import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function GET() {
  try {
    // Check if we have the Stripe key
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing STRIPE_SECRET_KEY environment variable",
        },
        { status: 500 },
      )
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Test the connection by listing a customer
    const customers = await stripe.customers.list({ limit: 1 })

    // Check if we have the price ID
    const hasPriceId = !!process.env.STRIPE_PRICE_ID

    // If we have a price ID, verify it exists
    let priceValid = false
    let priceDetails = null

    if (hasPriceId) {
      try {
        const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID!)
        priceValid = true
        priceDetails = {
          id: price.id,
          active: price.active,
          currency: price.currency,
          unit_amount: price.unit_amount,
          type: price.type,
          recurring: price.recurring
            ? {
                interval: price.recurring.interval,
                interval_count: price.recurring.interval_count,
              }
            : null,
        }
      } catch (priceError) {
        // Price doesn't exist or is invalid
      }
    }

    return NextResponse.json({
      success: true,
      stripeConnected: true,
      hasPriceId,
      priceValid,
      priceDetails: priceValid ? priceDetails : null,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        stripeConnected: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
