import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await requireAuth(request)
    const userId = decodedToken.uid
    console.log(`🔄 [Sync With Stripe] Request from user: ${userId}`)

    // Get all connected accounts from Stripe
    const connectedAccounts = await stripe.accounts.list({
      limit: 100,
    })

    console.log(`📊 [Sync With Stripe] Found ${connectedAccounts.data.length} connected accounts in Stripe`)

    // Find accounts that belong to this user
    const userAccountsInStripe = connectedAccounts.data.filter(
      (acc) => acc.metadata?.firebase_uid === userId || acc.email === decodedToken.email,
    )

    console.log(`👤 [Sync With Stripe] Found ${userAccountsInStripe.length} accounts for user ${userId}`)

    // Get current user data from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.exists ? userDoc.data() : {}

    // Prepare updates based on what we found in Stripe
    const updates: any = {
      updatedAt: new Date().toISOString(),
      stripeAccountsSyncedAt: new Date().toISOString(),
    }

    // Find test and live accounts
    const testAccounts = userAccountsInStripe.filter((acc) => !acc.livemode)
    const liveAccounts = userAccountsInStripe.filter((acc) => acc.livemode)

    if (testAccounts.length > 0) {
      const testAccount = testAccounts[0] // Use the first test account found
      updates.stripeTestAccountId = testAccount.id
      updates.stripeTestConnected = true
      updates.stripeTestAccountDetails = {
        type: testAccount.type,
        country: testAccount.country,
        email: testAccount.email,
        charges_enabled: testAccount.charges_enabled,
        payouts_enabled: testAccount.payouts_enabled,
        details_submitted: testAccount.details_submitted,
        synced_from_stripe: true,
      }
      console.log(`✅ [Sync With Stripe] Synced test account: ${testAccount.id}`)
    } else {
      // Clear test account data if no test accounts found in Stripe
      updates.stripeTestAccountId = null
      updates.stripeTestConnected = false
      updates.stripeTestAccountDetails = null
      console.log(`🧹 [Sync With Stripe] Cleared test account data (not found in Stripe)`)
    }

    if (liveAccounts.length > 0) {
      const liveAccount = liveAccounts[0] // Use the first live account found
      updates.stripeAccountId = liveAccount.id
      updates.stripeConnected = true
      updates.stripeAccountDetails = {
        type: liveAccount.type,
        country: liveAccount.country,
        email: liveAccount.email,
        charges_enabled: liveAccount.charges_enabled,
        payouts_enabled: liveAccount.payouts_enabled,
        details_submitted: liveAccount.details_submitted,
        synced_from_stripe: true,
      }
      console.log(`✅ [Sync With Stripe] Synced live account: ${liveAccount.id}`)
    } else {
      // Clear live account data if no live accounts found in Stripe
      updates.stripeAccountId = null
      updates.stripeConnected = false
      updates.stripeAccountDetails = null
      console.log(`🧹 [Sync With Stripe] Cleared live account data (not found in Stripe)`)
    }

    // Update Firestore with synced data
    await db.collection("users").doc(userId).update(updates)

    console.log(`💾 [Sync With Stripe] Updated Firestore for user: ${userId}`)

    return NextResponse.json({
      success: true,
      sync_results: {
        total_platform_accounts: connectedAccounts.data.length,
        user_accounts_found: userAccountsInStripe.length,
        test_accounts_found: testAccounts.length,
        live_accounts_found: liveAccounts.length,
        test_account_synced: testAccounts.length > 0 ? testAccounts[0].id : null,
        live_account_synced: liveAccounts.length > 0 ? liveAccounts[0].id : null,
      },
      before_sync: {
        stored_test_account: userData?.stripeTestAccountId || null,
        stored_live_account: userData?.stripeAccountId || null,
        test_connected_flag: userData?.stripeTestConnected || false,
        live_connected_flag: userData?.stripeConnected || false,
      },
      after_sync: {
        test_account_id: updates.stripeTestAccountId,
        live_account_id: updates.stripeAccountId,
        test_connected: updates.stripeTestConnected,
        live_connected: updates.stripeConnected,
      },
      user_accounts_in_stripe: userAccountsInStripe.map((acc) => ({
        id: acc.id,
        type: acc.type,
        email: acc.email,
        country: acc.country,
        livemode: acc.livemode,
        charges_enabled: acc.charges_enabled,
        payouts_enabled: acc.payouts_enabled,
        metadata: acc.metadata,
      })),
    })
  } catch (error: any) {
    console.error("❌ [Sync With Stripe] Error:", error)
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
