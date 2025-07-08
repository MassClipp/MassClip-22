import { type NextRequest, NextResponse } from "next/server"
import { stripe, STRIPE_CONFIG } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    // Only allow in test mode
    if (!STRIPE_CONFIG.isTestMode) {
      return NextResponse.json(
        {
          success: false,
          error: "This endpoint only works in test mode",
        },
        { status: 400 },
      )
    }

    const connectedAccountId = process.env.STRIPE_TEST_CONNECTED_ACCOUNT_ID

    if (!connectedAccountId) {
      return NextResponse.json(
        {
          success: false,
          error: "No connected account found",
        },
        { status: 400 },
      )
    }

    try {
      // Delete the test account
      await stripe.accounts.del(connectedAccountId)

      console.log("🗑️ Deleted test Stripe account:", connectedAccountId)
      console.log("Remove STRIPE_TEST_CONNECTED_ACCOUNT_ID from your environment variables")

      return NextResponse.json({
        success: true,
        message: "Test account disconnected successfully",
      })
    } catch (stripeError) {
      console.error("Failed to delete Stripe account:", stripeError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to disconnect account",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Disconnect failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to disconnect account",
      },
      { status: 500 },
    )
  }
}
