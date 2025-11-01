import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function GET() {
  try {
    console.log("🧪 [Stripe Connection] Testing basic Stripe connection...")

    // Test 1: Environment check
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "STRIPE_SECRET_KEY environment variable not found",
        },
        { status: 500 },
      )
    }

    // Test 2: Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    })

    console.log("✅ [Stripe Connection] Stripe initialized")

    // Test 3: Simple API call - list account details
    try {
      const account = await stripe.accounts.retrieve()

      console.log("✅ [Stripe Connection] Account retrieved:", {
        id: account.id,
        country: account.country,
        defaultCurrency: account.default_currency,
        chargesEnabled: account.charges_enabled,
      })

      return NextResponse.json({
        success: true,
        message: "Stripe connection successful",
        account: {
          id: account.id,
          country: account.country,
          defaultCurrency: account.default_currency,
          chargesEnabled: account.charges_enabled,
          detailsSubmitted: account.details_submitted,
        },
      })
    } catch (stripeError) {
      console.error("❌ [Stripe Connection] API call failed:", stripeError)

      return NextResponse.json(
        {
          success: false,
          error: "Stripe API call failed",
          details: stripeError instanceof Error ? stripeError.message : "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Stripe Connection] Test failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Stripe connection test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
