import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

interface ConnectedAccountsBody {
  idToken: string
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as ConnectedAccountsBody

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication token is required",
        },
        { status: 401 },
      )
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log(`✅ [Connected Accounts] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [Connected Accounts] Token verification failed:", tokenError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired authentication token",
        },
        { status: 401 },
      )
    }

    console.log(`🔍 [Connected Accounts] Fetching all platform accounts in ${isTestMode ? "TEST" : "LIVE"} mode`)

    try {
      // List all accounts connected to our platform
      const accounts = await stripe.accounts.list({
        limit: 100, // Adjust as needed
      })

      console.log(`📊 [Connected Accounts] Found ${accounts.data.length} total accounts`)

      // Filter accounts that belong to MassClip platform
      const massclipAccounts = accounts.data.filter((account) => {
        // Check if account has MassClip metadata
        const hasMassclipMetadata =
          account.metadata?.created_by_platform === "massclip" || account.metadata?.platform === "massclip"

        // Check if account is in the correct mode
        const correctMode = isTestMode ? !account.livemode : account.livemode

        return hasMassclipMetadata && correctMode
      })

      console.log(`🎯 [Connected Accounts] Found ${massclipAccounts.length} MassClip accounts`)

      // Format account data safely
      const formattedAccounts = massclipAccounts.map((account) => ({
        id: account.id,
        type: account.type,
        email: account.email,
        country: account.country,
        livemode: account.livemode,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        created: new Date(account.created * 1000).toISOString(),
        requirements_count:
          (account.requirements?.currently_due?.length || 0) + (account.requirements?.past_due?.length || 0),
        currently_due: account.requirements?.currently_due || [],
        past_due: account.requirements?.past_due || [],
        capabilities: account.capabilities,
        metadata: account.metadata,
        business_profile: account.business_profile,
      }))

      // Get platform account info
      const platformAccountId = process.env.STRIPE_ACCOUNT_ID || "acct_1RFLa9Dheyb0pkWF"
      let platformAccount = null

      try {
        // Note: We can't retrieve our own platform account via the API
        // But we can provide the known information
        platformAccount = {
          id: platformAccountId,
          type: "standard",
          is_platform: true,
          mode: isTestMode ? "test" : "live",
          note: "This is the MassClip platform account that hosts connected accounts",
        }
      } catch (platformError) {
        console.log(`⚠️ [Connected Accounts] Could not retrieve platform account info`)
      }

      return NextResponse.json({
        success: true,
        environment: {
          is_test_mode: isTestMode,
          mode: isTestMode ? "test" : "live",
        },
        platform_account: platformAccount,
        connected_accounts: {
          total_found: accounts.data.length,
          massclip_accounts: massclipAccounts.length,
          accounts: formattedAccounts,
        },
        summary: {
          fully_active: formattedAccounts.filter((acc) => acc.charges_enabled && acc.payouts_enabled).length,
          pending_verification: formattedAccounts.filter(
            (acc) => acc.details_submitted && (!acc.charges_enabled || !acc.payouts_enabled),
          ).length,
          needs_onboarding: formattedAccounts.filter((acc) => !acc.details_submitted).length,
          has_requirements: formattedAccounts.filter((acc) => acc.requirements_count > 0).length,
        },
        message: `Found ${massclipAccounts.length} accounts connected to MassClip platform in ${isTestMode ? "test" : "live"} mode`,
      })
    } catch (stripeError: any) {
      console.error("❌ [Connected Accounts] Stripe error:", stripeError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch connected accounts from Stripe",
          details: stripeError.message,
          stripe_error_code: stripeError.code,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Connected Accounts] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
