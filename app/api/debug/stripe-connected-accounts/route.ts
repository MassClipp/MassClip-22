import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode } from "@/lib/stripe"

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

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [Debug Connected Accounts] Fetching accounts in ${isTestMode ? "TEST" : "LIVE"} mode`)

    // Get all connected accounts from Stripe
    const connectedAccounts = await stripe.accounts.list({
      limit: 100,
    })

    console.log(`📊 [Debug Connected Accounts] Found ${connectedAccounts.data.length} total accounts`)

    // Filter and format accounts with safe timestamp handling
    const platformAccounts = connectedAccounts.data
      .filter((account) => {
        // Filter for accounts created by our platform
        const isPlatformAccount = account.metadata?.created_by_platform === "massclip" || account.metadata?.firebase_uid

        console.log(`Checking account ${account.id}:`, {
          isPlatformAccount,
          metadata: account.metadata,
          livemode: account.livemode,
        })

        return isPlatformAccount
      })
      .map((account) => {
        try {
          return {
            id: account.id,
            type: account.type,
            email: account.email,
            country: account.country,
            livemode: account.livemode,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            created: account.created,
            created_formatted: safeFormatDate(account.created),
            requirements: {
              currently_due: account.requirements?.currently_due || [],
              past_due: account.requirements?.past_due || [],
              disabled_reason: account.requirements?.disabled_reason,
            },
            metadata: account.metadata || {},
            business_profile: account.business_profile,
            capabilities: account.capabilities,
            tos_acceptance: account.tos_acceptance
              ? {
                  date: account.tos_acceptance.date,
                  date_formatted: safeFormatDate(account.tos_acceptance.date),
                  ip: account.tos_acceptance.ip,
                }
              : null,
          }
        } catch (formatError) {
          console.error(`Error formatting account ${account.id}:`, formatError)
          return {
            id: account.id,
            type: account.type,
            email: account.email,
            error: "Failed to format account data",
            raw_created: account.created,
          }
        }
      })

    // Separate test and live accounts
    const testAccounts = platformAccounts.filter((acc) => !acc.livemode)
    const liveAccounts = platformAccounts.filter((acc) => acc.livemode)

    return NextResponse.json({
      success: true,
      mode: isTestMode ? "test" : "live",
      summary: {
        total_stripe_accounts: connectedAccounts.data.length,
        platform_accounts: platformAccounts.length,
        test_accounts: testAccounts.length,
        live_accounts: liveAccounts.length,
      },
      accounts: {
        test: testAccounts,
        live: liveAccounts,
        all_platform: platformAccounts,
      },
      debug_info: {
        stripe_key_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 12) + "...",
        is_test_mode: isTestMode,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error("❌ [Debug Connected Accounts] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch connected accounts",
        details: error.message,
        debug_info: {
          stripe_key_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 12) + "...",
          is_test_mode: isTestMode,
        },
      },
      { status: 500 },
    )
  }
}
