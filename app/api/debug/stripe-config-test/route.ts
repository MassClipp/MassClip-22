import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET() {
  try {
    // Check Stripe configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          error: "Missing Stripe secret key",
          details: "STRIPE_SECRET_KEY environment variable not set",
        },
        { status: 500 },
      )
    }

    // Determine if we're in test or live mode
    const isTestMode = stripeSecretKey.startsWith("sk_test_")
    const isLiveMode = stripeSecretKey.startsWith("sk_live_")

    // Test Stripe connection by listing a few prices
    let prices: Stripe.Price[] = []
    let stripeConnectionError: string | null = null

    try {
      const pricesResponse = await stripe.prices.list({ limit: 5 })
      prices = pricesResponse.data
    } catch (error: any) {
      stripeConnectionError = error.message
    }

    // Test the specific price ID from the debug page
    const testPriceId = "price_1QCqGhP8mGrl6RNHK8tJYqzV"
    let testPriceResult: any = null
    let testPriceError: string | null = null

    try {
      const testPrice = await stripe.prices.retrieve(testPriceId)
      testPriceResult = {
        id: testPrice.id,
        amount: testPrice.unit_amount,
        currency: testPrice.currency,
        active: testPrice.active,
        product: testPrice.product,
        created: new Date(testPrice.created * 1000).toISOString(),
      }
    } catch (error: any) {
      testPriceError = error.message
    }

    return NextResponse.json({
      success: true,
      stripeMode: {
        isTestMode,
        isLiveMode,
        keyPrefix: stripeSecretKey.substring(0, 8) + "...",
        mode: isTestMode ? "test" : isLiveMode ? "live" : "unknown",
      },
      environment: {
        hasSecretKey: !!stripeSecretKey,
        hasPublishableKey: !!stripePublishableKey,
        publishableKeyPrefix: stripePublishableKey?.substring(0, 8) + "...",
      },
      stripeConnection: {
        success: !stripeConnectionError,
        error: stripeConnectionError,
        pricesFound: prices.length,
        samplePrices: prices.slice(0, 3).map((p) => ({
          id: p.id,
          amount: p.unit_amount,
          currency: p.currency,
          active: p.active,
        })),
      },
      testPriceValidation: {
        priceId: testPriceId,
        found: !!testPriceResult,
        error: testPriceError,
        details: testPriceResult,
        modeMatch: testPriceResult ? "Price exists in current Stripe mode" : "Price not found in current mode",
      },
    })
  } catch (error: any) {
    console.error("Stripe config test error:", error)
    return NextResponse.json(
      {
        error: "Stripe configuration test failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
