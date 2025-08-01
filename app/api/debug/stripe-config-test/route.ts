import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function GET() {
  try {
    console.log("🔍 [Stripe Config] Testing Stripe configuration...")

    // Check environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          error: "Stripe secret key not configured",
          details: "STRIPE_SECRET_KEY environment variable is missing",
        },
        { status: 500 },
      )
    }

    if (!stripePublishableKey) {
      return NextResponse.json(
        {
          error: "Stripe publishable key not configured",
          details: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is missing",
        },
        { status: 500 },
      )
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
    })

    // Test Stripe connection
    console.log("🔍 [Stripe Config] Testing Stripe API connection...")

    try {
      // List some prices to verify connection
      const prices = await stripe.prices.list({
        limit: 10,
        active: true,
      })

      console.log("✅ [Stripe Config] Stripe API connection successful")

      return NextResponse.json({
        success: true,
        message: "Stripe configuration verified",
        config: {
          hasSecretKey: !!stripeSecretKey,
          hasPublishableKey: !!stripePublishableKey,
          secretKeyPrefix: stripeSecretKey.substring(0, 8) + "...",
          publishableKeyPrefix: stripePublishableKey.substring(0, 8) + "...",
          apiVersion: "2024-06-20",
        },
        prices: {
          total: prices.data.length,
          available: prices.data.map((price) => ({
            id: price.id,
            amount: price.unit_amount,
            currency: price.currency,
            product: price.product,
            active: price.active,
          })),
        },
      })
    } catch (stripeError: any) {
      console.error("❌ [Stripe Config] Stripe API connection failed:", stripeError)

      return NextResponse.json(
        {
          error: "Stripe API connection failed",
          details: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Stripe Config] Unexpected error:", error)

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
