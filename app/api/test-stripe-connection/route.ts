import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function GET() {
  try {
    // Check if Stripe API key is set
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ success: false, message: "Stripe API key is not configured" }, { status: 500 })
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Test connection by fetching account details
    const account = await stripe.accounts.retrieve()

    // Check if price ID is set
    const priceId = process.env.STRIPE_PRICE_ID
    let priceDetails = null

    if (priceId) {
      try {
        priceDetails = await stripe.prices.retrieve(priceId)
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            message: "Stripe connection successful, but price ID is invalid",
            error: error instanceof Error ? error.message : "Unknown error",
            accountId: account.id,
          },
          { status: 200 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: "Stripe connection successful",
      accountId: account.id,
      priceId: priceId || "Not configured",
      priceDetails: priceDetails
        ? {
            id: priceDetails.id,
            active: priceDetails.active,
            currency: priceDetails.currency,
            product: priceDetails.product,
            unitAmount: priceDetails.unit_amount,
          }
        : null,
    })
  } catch (error) {
    console.error("Error testing Stripe connection:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to connect to Stripe",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
