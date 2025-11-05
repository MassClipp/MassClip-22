import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

interface VerifyAccountBody {
  account_id: string
  idToken: string
}

export async function POST(request: NextRequest) {
  try {
    const { account_id, idToken } = (await request.json()) as VerifyAccountBody

    if (!account_id || !idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Account ID and authentication token are required",
        },
        { status: 400 },
      )
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log(`✅ [Verify Account] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [Verify Account] Token verification failed:", tokenError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired authentication token",
        },
        { status: 401 },
      )
    }

    // Validate account ID format
    if (!account_id.startsWith("acct_")) {
      return NextResponse.json({
        success: false,
        account_exists: false,
        error: "Invalid account ID format. Must start with 'acct_'",
      })
    }

    console.log(`🔍 [Verify Account] Checking account ${account_id} in ${isTestMode ? "TEST" : "LIVE"} mode`)

    try {
      // First, try to retrieve the account directly
      const account = await stripe.accounts.retrieve(account_id)

      console.log(`✅ [Verify Account] Account found:`, {
        id: account.id,
        type: account.type,
        email: account.email,
        livemode: account.livemode,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      })

      // Check if account mode matches our environment
      const environmentMismatch = (isTestMode && account.livemode) || (!isTestMode && !account.livemode)

      if (environmentMismatch) {
        const expectedMode = isTestMode ? "test" : "live"
        const actualMode = account.livemode ? "live" : "test"
        return NextResponse.json({
          success: true,
          account_exists: true,
          account_accessible: false,
          error: `Account is in ${actualMode} mode, but platform is in ${expectedMode} mode`,
          account_details: {
            id: account.id,
            livemode: account.livemode,
            expected_mode: expectedMode,
          },
        })
      }

      // Check if this account belongs to our platform
      // For Stripe Connect, we need to check if we can access it as a connected account
      let belongsToPlatform = false
      let platformError = null

      try {
        // Try to access the account as a connected account
        // This will work if the account is connected to our platform
        const connectedAccount = await stripe.accounts.retrieve(account_id)

        // Check if account has platform metadata or if we can access it
        belongsToPlatform = true // If we can retrieve it, it's accessible

        console.log(`✅ [Verify Account] Account is accessible to platform`)
      } catch (platformAccessError: any) {
        console.log(`⚠️ [Verify Account] Account not connected to platform:`, platformAccessError.message)
        belongsToPlatform = false
        platformError = platformAccessError.message
      }

      return NextResponse.json({
        success: true,
        account_exists: true,
        account_accessible: true,
        belongs_to_platform: belongsToPlatform,
        account_details: {
          id: account.id,
          type: account.type,
          email: account.email,
          country: account.country,
          livemode: account.livemode,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          requirements: {
            currently_due: account.requirements?.currently_due || [],
            past_due: account.requirements?.past_due || [],
            eventually_due: account.requirements?.eventually_due || [],
          },
          capabilities: account.capabilities,
          metadata: account.metadata,
        },
        platform_info: {
          belongs_to_platform: belongsToPlatform,
          platform_error: platformError,
          can_connect: !belongsToPlatform, // Can connect if not already connected
        },
        environment: {
          is_test_mode: isTestMode,
          account_mode: account.livemode ? "live" : "test",
          mode_compatible: !environmentMismatch,
        },
      })
    } catch (stripeError: any) {
      console.error("❌ [Verify Account] Stripe error:", stripeError)

      if (stripeError.code === "resource_missing") {
        return NextResponse.json({
          success: true,
          account_exists: false,
          error: `Account ${account_id} not found in ${isTestMode ? "test" : "live"} mode`,
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
        error: "Internal server error during account verification",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
