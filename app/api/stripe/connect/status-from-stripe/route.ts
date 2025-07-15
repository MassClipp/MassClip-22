import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await requireAuth(request)
    const userId = decodedToken.uid
    console.log(`🔍 [Status From Stripe] Request from user: ${userId}`)
    console.log(`🔍 [Status From Stripe] User email: ${decodedToken.email}`)

    // Get user's stored account IDs from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.exists ? userDoc.data() : {}

    const storedTestAccountId = userData?.stripeTestAccountId
    const storedLiveAccountId = userData?.stripeAccountId

    console.log(`📊 [Status From Stripe] Stored account IDs:`, {
      test: storedTestAccountId,
      live: storedLiveAccountId,
    })

    // Get all connected accounts from Stripe
    const connectedAccounts = await stripe.accounts.list({
      limit: 100,
    })

    console.log(`📊 [Status From Stripe] Found ${connectedAccounts.data.length} connected accounts in Stripe`)

    // Log all accounts for debugging
    connectedAccounts.data.forEach((account, index) => {
      console.log(`Account ${index + 1}:`, {
        id: account.id,
        email: account.email,
        type: account.type,
        metadata: account.metadata,
        created: new Date(account.created * 1000).toISOString(),
      })
    })

    // Check if any of our stored account IDs are actually connected
    const testAccountInStripe = storedTestAccountId
      ? connectedAccounts.data.find((acc) => acc.id === storedTestAccountId)
      : null
    const liveAccountInStripe = storedLiveAccountId
      ? connectedAccounts.data.find((acc) => acc.id === storedLiveAccountId)
      : null

    // Find accounts that might belong to this user based on metadata and email
    const userAccountsInStripe = connectedAccounts.data.filter((acc) => {
      const hasPlatformMetadata = acc.metadata?.created_by_platform === "massclip"
      const hasUserMetadata = acc.metadata?.firebase_uid === userId
      const hasMatchingEmail = acc.email === decodedToken.email

      console.log(`Checking account ${acc.id}:`, {
        hasPlatformMetadata,
        hasUserMetadata,
        hasMatchingEmail,
        metadata: acc.metadata,
      })

      return hasPlatformMetadata && (hasUserMetadata || hasMatchingEmail)
    })

    console.log(`🎯 [Status From Stripe] Found ${userAccountsInStripe.length} user accounts`)

    // Determine actual connection status
    const hasTestConnection = !!testAccountInStripe
    const hasLiveConnection = !!liveAccountInStripe
    const hasAnyConnection = hasTestConnection || hasLiveConnection || userAccountsInStripe.length > 0

    const primaryAccount = testAccountInStripe || liveAccountInStripe || userAccountsInStripe[0] || null

    // If we have a primary account, get its full details
    let accountDetails = null
    if (primaryAccount) {
      try {
        const fullAccount = await stripe.accounts.retrieve(primaryAccount.id)
        accountDetails = {
          id: fullAccount.id,
          type: fullAccount.type,
          country: fullAccount.country,
          email: fullAccount.email,
          created: new Date(fullAccount.created * 1000).toISOString(),
          charges_enabled: fullAccount.charges_enabled,
          payouts_enabled: fullAccount.payouts_enabled,
          details_submitted: fullAccount.details_submitted,
          requirements: {
            currently_due: fullAccount.requirements?.currently_due || [],
            past_due: fullAccount.requirements?.past_due || [],
            pending_verification: fullAccount.requirements?.pending_verification || [],
            disabled_reason: fullAccount.requirements?.disabled_reason,
          },
          capabilities: fullAccount.capabilities,
          metadata: fullAccount.metadata,
          business_profile: fullAccount.business_profile,
        }
      } catch (error) {
        console.error(`❌ [Status From Stripe] Error retrieving account details for ${primaryAccount.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      connection_status: {
        is_connected: hasAnyConnection,
        has_test_connection: hasTestConnection,
        has_live_connection: hasLiveConnection,
        primary_account_id: primaryAccount?.id || null,
        mode: primaryAccount?.livemode === false ? "test" : primaryAccount?.livemode === true ? "live" : "unknown",
      },
      stored_data: {
        test_account_id: storedTestAccountId,
        live_account_id: storedLiveAccountId,
        test_connected_flag: userData?.stripeTestConnected || false,
        live_connected_flag: userData?.stripeConnected || false,
      },
      stripe_verification: {
        test_account_exists_in_stripe: !!testAccountInStripe,
        live_account_exists_in_stripe: !!liveAccountInStripe,
        total_platform_accounts: connectedAccounts.data.length,
        user_accounts_found: userAccountsInStripe.length,
      },
      account_details: accountDetails,
      all_user_accounts: userAccountsInStripe.map((acc) => ({
        id: acc.id,
        type: acc.type,
        email: acc.email,
        country: acc.country,
        charges_enabled: acc.charges_enabled,
        payouts_enabled: acc.payouts_enabled,
        metadata: acc.metadata,
      })),
      debug_info: {
        user_id: userId,
        user_email: decodedToken.email,
        stripe_key_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 12) + "...",
        expected_platform_account: "acct_1RFLa9Dheyb0pkWF",
        total_accounts_in_stripe: connectedAccounts.data.length,
      },
      message: hasAnyConnection
        ? `Connected to Stripe account: ${primaryAccount?.id}`
        : "No Stripe accounts connected to this platform",
    })
  } catch (error: any) {
    console.error("❌ [Status From Stripe] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code,
        debug_info: {
          stripe_key_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 12) + "...",
          expected_platform_account: "acct_1RFLa9Dheyb0pkWF",
        },
      },
      { status: 500 },
    )
  }
}
