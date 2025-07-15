import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await requireAuth(request)
    console.log(`🔍 [Connected Accounts] Request from user: ${decodedToken.uid}`)

    // Get all connected accounts from Stripe
    const connectedAccounts = await stripe.accounts.list({
      limit: 100,
    })

    console.log(`📊 [Connected Accounts] Found ${connectedAccounts.data.length} total accounts`)

    // Helper function to safely format timestamps
    const safeFormatDate = (timestamp: number | null | undefined): string => {
      if (!timestamp || typeof timestamp !== "number") {
        return "Unknown"
      }
      try {
        return new Date(timestamp * 1000).toISOString()
      } catch (error) {
        console.warn(`Invalid timestamp: ${timestamp}`)
        return "Invalid Date"
      }
    }

    // Filter accounts that belong to our platform
    const platformAccounts = connectedAccounts.data.filter((account) => {
      return account.metadata?.created_by_platform === "massclip"
    })

    console.log(`🎯 [Connected Accounts] Found ${platformAccounts.length} platform accounts`)

    // Format account data safely
    const formattedAccounts = platformAccounts.map((account) => ({
      id: account.id,
      type: account.type,
      country: account.country || "Unknown",
      email: account.email || "Not provided",
      created: safeFormatDate(account.created),
      charges_enabled: account.charges_enabled || false,
      payouts_enabled: account.payouts_enabled || false,
      details_submitted: account.details_submitted || false,
      requirements: {
        currently_due: account.requirements?.currently_due || [],
        past_due: account.requirements?.past_due || [],
        pending_verification: account.requirements?.pending_verification || [],
        disabled_reason: account.requirements?.disabled_reason || null,
      },
      capabilities: account.capabilities || {},
      metadata: account.metadata || {},
      business_profile: account.business_profile || {},
    }))

    // Format all accounts for debug
    const allAccountsDebug = connectedAccounts.data.map((account) => ({
      id: account.id,
      email: account.email || "Not provided",
      type: account.type,
      created: safeFormatDate(account.created),
      metadata: account.metadata || {},
    }))

    return NextResponse.json({
      success: true,
      total_accounts: connectedAccounts.data.length,
      platform_accounts: platformAccounts.length,
      accounts: formattedAccounts,
      all_accounts_debug: allAccountsDebug,
      debug_info: {
        stripe_context: {
          api_key_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 12) + "...",
          test_mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || false,
        },
        query_time: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error("❌ [Connected Accounts] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code,
        debug_info: {
          stripe_context: {
            api_key_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 12) + "...",
            test_mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || false,
          },
        },
      },
      { status: 500 },
    )
  }
}
