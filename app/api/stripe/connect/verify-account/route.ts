import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode } from "@/lib/stripe"

interface VerifyAccountBody {
  account_id: string
  idToken?: string
}

// Safe date formatting helper
function safeFormatDate(timestamp: number | null | undefined): string {
  if (!timestamp || typeof timestamp !== "number") {
    return new Date().toISOString()
  }

  try {
    // Stripe timestamps are in seconds, convert to milliseconds
    const date = new Date(timestamp * 1000)
    if (isNaN(date.getTime())) {
      console.warn(`Invalid timestamp: ${timestamp}`)
      return new Date().toISOString()
    }
    return date.toISOString()
  } catch (error) {
    console.warn(`Error formatting timestamp ${timestamp}:`, error)
    return new Date().toISOString()
  }
}

export async function POST(request: NextRequest) {
  try {
    const { account_id, idToken } = (await request.json()) as VerifyAccountBody

    if (!account_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Account ID is required",
        },
        { status: 400 },
      )
    }

    // Validate account ID format
    if (!account_id.startsWith("acct_")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid account ID format. Must start with 'acct_'",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 [Verify Account] Checking account ${account_id} in ${isTestMode ? "TEST" : "LIVE"} mode`)

    try {
      // Retrieve account from Stripe
      const account = await stripe.accounts.retrieve(account_id)

      console.log(`✅ [Verify Account] Account retrieved successfully:`, {
        id: account.id,
        type: account.type,
        country: account.country,
        livemode: account.livemode,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        created: account.created,
      })

      // Check if account mode matches our environment
      const environmentMismatch = (isTestMode && account.livemode) || (!isTestMode && !account.livemode)

      if (environmentMismatch) {
        const expectedMode = isTestMode ? "test" : "live"
        const actualMode = account.livemode ? "live" : "test"
        return NextResponse.json({
          success: false,
          account_exists: true,
          error: `Cannot verify ${actualMode} mode account in ${expectedMode} environment`,
          account_details: {
            id: account.id,
            livemode: account.livemode,
            expected_mode: expectedMode,
          },
        })
      }

      // Safely format account details with proper timestamp handling
      const accountDetails = {
        id: account.id,
        object: account.object,
        business_profile: account.business_profile,
        business_type: account.business_type,
        capabilities: account.capabilities,
        charges_enabled: account.charges_enabled,
        country: account.country,
        created: account.created, // Keep as Unix timestamp for Stripe compatibility
        created_formatted: safeFormatDate(account.created),
        default_currency: account.default_currency,
        details_submitted: account.details_submitted,
        email: account.email,
        external_accounts: account.external_accounts,
        future_requirements: account.future_requirements,
        livemode: account.livemode,
        metadata: account.metadata,
        payouts_enabled: account.payouts_enabled,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          disabled_reason: account.requirements?.disabled_reason,
          errors: account.requirements?.errors || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
          pending_verification: account.requirements?.pending_verification || [],
        },
        settings: account.settings,
        tos_acceptance: account.tos_acceptance
          ? {
              date: account.tos_acceptance.date,
              date_formatted: safeFormatDate(account.tos_acceptance.date),
              ip: account.tos_acceptance.ip,
              user_agent: account.tos_acceptance.user_agent,
            }
          : null,
        type: account.type,
      }

      // Calculate requirements count
      const requirementsCount =
        (account.requirements?.currently_due?.length || 0) + (account.requirements?.past_due?.length || 0)

      return NextResponse.json({
        success: true,
        account_exists: true,
        account_id: account.id,
        mode: isTestMode ? "test" : "live",
        account_details: accountDetails,
        summary: {
          id: account.id,
          type: account.type,
          country: account.country,
          email: account.email,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          livemode: account.livemode,
          requirements_count: requirementsCount,
          created_at: safeFormatDate(account.created),
        },
        message: `Account ${account.id} verified successfully in ${isTestMode ? "test" : "live"} mode`,
      })
    } catch (stripeError: any) {
      console.error("❌ [Verify Account] Stripe API error:", {
        code: stripeError.code,
        type: stripeError.type,
        message: stripeError.message,
        account_id,
        mode: isTestMode ? "test" : "live",
      })

      // Handle specific Stripe error types
      if (stripeError.code === "resource_missing") {
        return NextResponse.json({
          success: false,
          account_exists: false,
          error: `Account ${account_id} not found in ${isTestMode ? "test" : "live"} mode`,
          details: stripeError.message,
        })
      }

      if (stripeError.code === "invalid_request_error") {
        return NextResponse.json({
          success: false,
          account_exists: false,
          error: "Invalid account ID format or request",
          details: stripeError.message,
        })
      }

      return NextResponse.json({
        success: false,
        account_exists: false,
        error: "Failed to verify account with Stripe",
        details: stripeError.message,
        stripe_error_code: stripeError.code,
      })
    }
  } catch (error: any) {
    console.error("❌ [Verify Account] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        account_exists: false,
        error: "Internal server error during account verification",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
