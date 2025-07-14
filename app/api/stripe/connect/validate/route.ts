import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
    }

    // Validate account ID format
    if (!accountId.startsWith("acct_")) {
      return NextResponse.json({
        valid: false,
        error: "Invalid account ID format. Must start with 'acct_'",
      })
    }

    console.log(`🔍 [Account Validation] Checking account: ${accountId}`)

    try {
      // Try to retrieve the account
      const account = await stripe.accounts.retrieve(accountId)

      // Check if account is in the correct mode
      const accountIsTest = accountId.includes("_test_") || account.livemode === false
      const modeMatch = isTestMode === accountIsTest

      if (!modeMatch) {
        return NextResponse.json({
          valid: false,
          error: `Account is in ${accountIsTest ? "test" : "live"} mode, but system is in ${isTestMode ? "test" : "live"} mode`,
          accountInfo: {
            id: account.id,
            type: account.type,
            country: account.country,
            livemode: account.livemode,
          },
        })
      }

      console.log(`✅ [Account Validation] Account is valid:`, {
        id: account.id,
        type: account.type,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      })

      return NextResponse.json({
        valid: true,
        accountInfo: {
          id: account.id,
          type: account.type,
          country: account.country,
          email: account.email,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          livemode: account.livemode,
          requirementsCount:
            (account.requirements?.currently_due?.length || 0) + (account.requirements?.past_due?.length || 0),
        },
      })
    } catch (stripeError: any) {
      console.error("❌ [Account Validation] Stripe error:", stripeError)

      if (stripeError.code === "resource_missing") {
        return NextResponse.json({
          valid: false,
          error: "Account not found. Please check the account ID.",
        })
      }

      if (stripeError.code === "permission_denied") {
        return NextResponse.json({
          valid: false,
          error: "Cannot access this account. Make sure it's accessible from your platform.",
        })
      }

      return NextResponse.json({
        valid: false,
        error: "Failed to validate account",
        details: stripeError.message,
      })
    }
  } catch (error: any) {
    console.error("❌ [Account Validation] Unexpected error:", error)
    return NextResponse.json(
      {
        valid: false,
        error: "Validation failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
