import { type NextRequest, NextResponse } from "next/server"
import { stripe, STRIPE_CONFIG } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    // Only allow in test mode
    if (!STRIPE_CONFIG.isTestMode) {
      return NextResponse.json({
        connected: false,
        isTestMode: false,
        error: "This endpoint only works in test mode",
      })
    }

    // Check if we have a connected account stored
    // In a real app, you'd get this from your database
    // For this test page, we'll check if there's an account in environment variables
    const connectedAccountId = process.env.STRIPE_TEST_CONNECTED_ACCOUNT_ID

    if (!connectedAccountId) {
      return NextResponse.json({
        connected: false,
        isTestMode: true,
      })
    }

    try {
      // Retrieve account details from Stripe
      const account = await stripe.accounts.retrieve(connectedAccountId)

      return NextResponse.json({
        connected: true,
        isTestMode: true,
        account: {
          id: account.id,
          email: account.email,
          country: account.country,
          default_currency: account.default_currency,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          requirements: {
            currently_due: account.requirements?.currently_due || [],
            eventually_due: account.requirements?.eventually_due || [],
            past_due: account.requirements?.past_due || [],
          },
        },
      })
    } catch (stripeError) {
      console.error("Failed to retrieve Stripe account:", stripeError)
      return NextResponse.json({
        connected: false,
        isTestMode: true,
        error: "Connected account not found or invalid",
      })
    }
  } catch (error) {
    console.error("Status check failed:", error)
    return NextResponse.json(
      {
        connected: false,
        isTestMode: STRIPE_CONFIG.isTestMode,
        error: "Failed to check connection status",
      },
      { status: 500 },
    )
  }
}
