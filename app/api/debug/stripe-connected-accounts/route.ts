import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await requireAuth(request)
    const userId = decodedToken.uid
    console.log(`🔍 [Debug Connected Accounts] Request from user: ${userId}`)

    // Get all connected accounts from Stripe
    const connectedAccounts = await stripe.accounts.list({
      limit: 100,
    })

    console.log(`📊 [Debug Connected Accounts] Found ${connectedAccounts.data.length} total accounts in Stripe`)

    // Log each account for debugging
    connectedAccounts.data.forEach((account, index) => {
      console.log(`Account ${index + 1}:`, {
        id: account.id,
        email: account.email,
        type: account.type,
        country: account.country,
        created: new Date(account.created * 1000).toISOString(),
        metadata: account.metadata,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      })
    })

    // Filter accounts that might belong to our platform
    const platformAccounts = connectedAccounts.data.filter((account) => {
      // Check if account has our platform metadata
      const hasPlatformMetadata = account.metadata?.created_by_platform === "massclip"

      // Check if account metadata contains our user ID
      const hasUserMetadata = account.metadata?.firebase_uid === userId

      // Check if account email matches user email
      const hasMatchingEmail = account.email === decodedToken.email

      console.log(`Account ${account.id} filters:`, {
        hasPlatformMetadata,
        hasUserMetadata,
        hasMatchingEmail,
        metadata: account.metadata,
      })

      return hasPlatformMetadata || hasUserMetadata || hasMatchingEmail
    })

    console.log(`🎯 [Debug Connected Accounts] Found ${platformAccounts.length} platform-related accounts`)

    return NextResponse.json({
      success: true,
      total_accounts: connectedAccounts.data.length,
      platform_accounts: platformAccounts.length,
      user_id: userId,
      user_email: decodedToken.email,
      stripe_context: {
        api_key_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 12) + "...",
        test_mode: process.env.STRIPE_SECRET_KEY?.includes("test"),
      },
      accounts: platformAccounts.map((account) => ({
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
        created: new Date(account.created * 1000).toISOString(),
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        metadata: account.metadata,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          past_due: account.requirements?.past_due || [],
          pending_verification: account.requirements?.pending_verification || [],
          disabled_reason: account.requirements?.disabled_reason,
        },
      })),
      all_accounts_debug: connectedAccounts.data.map((account) => ({
        id: account.id,
        email: account.email,
        type: account.type,
        metadata: account.metadata,
        created: new Date(account.created * 1000).toISOString(),
      })),
    })
  } catch (error: any) {
    console.error("❌ [Debug Connected Accounts] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code,
        stripe_context: {
          api_key_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 12) + "...",
          test_mode: process.env.STRIPE_SECRET_KEY?.includes("test"),
        },
      },
      { status: 500 },
    )
  }
}
