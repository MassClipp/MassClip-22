import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await requireAuth(request)
    const userId = decodedToken.uid
    console.log(`🔄 [Sync with Stripe] Request from user: ${userId}`)

    // Get all connected accounts from Stripe
    const connectedAccounts = await stripe.accounts.list({
      limit: 100,
    })

    console.log(`📊 [Sync with Stripe] Found ${connectedAccounts.data.length} total accounts in Stripe`)

    // Find accounts that belong to this user
    const userAccountsInStripe = connectedAccounts.data.filter((acc) => {
      const hasPlatformMetadata = acc.metadata?.created_by_platform === "massclip"
      const hasUserMetadata = acc.metadata?.firebase_uid === userId
      const hasMatchingEmail = acc.email === decodedToken.email

      return hasPlatformMetadata && (hasUserMetadata || hasMatchingEmail)
    })

    console.log(`🎯 [Sync with Stripe] Found ${userAccountsInStripe.length} user accounts`)

    // Get current user data from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.exists ? userDoc.data() : {}

    // Determine which accounts to sync
    const testAccounts = userAccountsInStripe.filter((acc) => acc.livemode === false)
    const liveAccounts = userAccountsInStripe.filter((acc) => acc.livemode === true)

    const primaryTestAccount = testAccounts[0]
    const primaryLiveAccount = liveAccounts[0]

    // Update Firestore with the synced data
    const updateData: any = {
      updatedAt: new Date().toISOString(),
      lastStripeSync: new Date().toISOString(),
    }

    if (primaryTestAccount) {
      updateData.stripeTestAccountId = primaryTestAccount.id
      updateData.stripeTestConnected = true
      updateData.stripeTestAccountDetails = {
        type: primaryTestAccount.type,
        country: primaryTestAccount.country,
        email: primaryTestAccount.email,
        charges_enabled: primaryTestAccount.charges_enabled,
        payouts_enabled: primaryTestAccount.payouts_enabled,
        details_submitted: primaryTestAccount.details_submitted,
      }
    }

    if (primaryLiveAccount) {
      updateData.stripeAccountId = primaryLiveAccount.id
      updateData.stripeConnected = true
      updateData.stripeAccountDetails = {
        type: primaryLiveAccount.type,
        country: primaryLiveAccount.country,
        email: primaryLiveAccount.email,
        charges_enabled: primaryLiveAccount.charges_enabled,
        payouts_enabled: primaryLiveAccount.payouts_enabled,
        details_submitted: primaryLiveAccount.details_submitted,
      }
    }

    // If no accounts found, clear the connection flags
    if (userAccountsInStripe.length === 0) {
      updateData.stripeTestConnected = false
      updateData.stripeConnected = false
    }

    await db.collection("users").doc(userId).update(updateData)

    console.log(`💾 [Sync with Stripe] Updated Firestore for user: ${userId}`)

    return NextResponse.json({
      success: true,
      sync_results: {
        total_accounts_in_stripe: connectedAccounts.data.length,
        user_accounts_found: userAccountsInStripe.length,
        test_accounts_found: testAccounts.length,
        live_accounts_found: liveAccounts.length,
        primary_test_account: primaryTestAccount?.id || null,
        primary_live_account: primaryLiveAccount?.id || null,
      },
      updated_data: updateData,
      user_accounts: userAccountsInStripe.map((acc) => ({
        id: acc.id,
        type: acc.type,
        email: acc.email,
        livemode: acc.livemode,
        charges_enabled: acc.charges_enabled,
        payouts_enabled: acc.payouts_enabled,
        metadata: acc.metadata,
      })),
      debug_info: {
        user_id: userId,
        user_email: decodedToken.email,
        stripe_key_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 12) + "...",
      },
    })
  } catch (error: any) {
    console.error("❌ [Sync with Stripe] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code,
      },
      { status: 500 },
    )
  }
}
