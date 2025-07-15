import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode } from "@/lib/stripe"

interface ValidateBody {
  accountId: string
}

export async function POST(request: NextRequest) {
  try {
    const { accountId } = (await request.json()) as ValidateBody

    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: "Account ID is required",
        },
        { status: 400 },
      )
    }

    // Validate account ID format
    if (!accountId.startsWith("acct_")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid account ID format. Must start with 'acct_'",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 [Validate] Checking account ${accountId} in ${isTestMode ? "TEST" : "LIVE"} mode`)

    // Retrieve the account from Stripe
    let account
    try {
      account = await stripe.accounts.retrieve(accountId)
      console.log(`✅ [Validate] Account retrieved:`, {
        id: account.id,
        type: account.type,
        country: account.country,
        livemode: account.livemode,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      })
    } catch (stripeError: any) {
      console.error("❌ [Validate] Stripe error:", stripeError)

      if (stripeError.code === "resource_missing") {
        return NextResponse.json(
          {
            success: false,
            error: "Account not found. Please check the account ID.",
          },
          { status: 404 },
        )
      }

      if (stripeError.code === "permission_denied") {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot access this account. Make sure it's accessible from your platform.",
          },
          { status: 403 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: `Stripe API error: ${stripeError.message}`,
        },
        { status: 400 },
      )
    }

    // Check if account mode matches our environment
    const accountIsTest = !account.livemode
    const environmentMismatch = (isTestMode && account.livemode) || (!isTestMode && !account.livemode)

    if (environmentMismatch) {
      const expectedMode = isTestMode ? "test" : "live"
      const actualMode = account.livemode ? "live" : "test"
      return NextResponse.json(
        {
          success: false,
          error: `Account mode mismatch. Expected ${expectedMode} mode account, but got ${actualMode} mode account.`,
        },
        { status: 400 },
      )
    }

    // Check account requirements
    const requirements = account.requirements || {}
    const currentlyDue = requirements.currently_due || []
    const pastDue = requirements.past_due || []
    const requirementsCount = currentlyDue.length + pastDue.length

    console.log(`✅ [Validate] Account validation successful for ${account.id}`)

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        email: account.email,
        country: account.country,
        type: account.type,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        livemode: account.livemode,
        requirementsCount,
        currentlyDue,
        pastDue,
        // Raw account data for debugging
        rawAccount: {
          business_type: account.business_type,
          created: account.created,
          default_currency: account.default_currency,
          capabilities: account.capabilities,
        },
      },
    })
  } catch (error: any) {
    console.error("❌ [Validate] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during validation",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
