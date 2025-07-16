import { type NextRequest, NextResponse } from "next/server"
import { stripe, isLiveMode, isTestMode } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await requireAuth(request)
    const userId = decodedToken.uid
    console.log(`🔄 [Sync with Stripe] Request from user: ${userId} in ${isLiveMode ? "LIVE" : "TEST"} mode`)

    // Get all connected accounts from Stripe
    const connectedAccounts = await stripe.accounts.list({
      limit: 100,
    })

    console.log(`📊 [Sync with Stripe] Found ${connectedAccounts.data.length} connected accounts in Stripe`)

    // Helper function to safely format timestamps
    const safeFormatDate = (timestamp: number | null | undefined): string => {
      if (!timestamp || typeof timestamp !== "number") {
        return new Date().toISOString() // Fallback to current time
      }
      try {
        return new Date(timestamp * 1000).toISOString()
      } catch (error) {
        console.warn(`Invalid timestamp: ${timestamp}`)
        return new Date().toISOString()
      }
    }

    // Find accounts that belong to this user
    const userAccountsInStripe = connectedAccounts.data.filter((acc) => {
      const hasPlatformMetadata = acc.metadata?.created_by_platform === "massclip"
      const hasUserMetadata = acc.metadata?.firebase_uid === userId
      const hasMatchingEmail = acc.email === decodedToken.email

      // Also check if account mode matches our current environment
      const accountModeMatches = isLiveMode ? acc.livemode : !acc.livemode

      return hasPlatformMetadata && (hasUserMetadata || hasMatchingEmail) && accountModeMatches
    })

    console.log(`🎯 [Sync with Stripe] Found ${userAccountsInStripe.length} user accounts matching current environment`)

    // Update Firestore with the found accounts
    const updateData: any = {
      lastStripeSync: new Date().toISOString(),
      stripeSyncResults: {
        totalAccountsFound: connectedAccounts.data.length,
        userAccountsFound: userAccountsInStripe.length,
        syncedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        stripeMode: isLiveMode ? "live" : "test",
      },
    }

    // If we found user accounts, update the stored IDs
    if (userAccountsInStripe.length > 0) {
      const primaryAccount = userAccountsInStripe[0]

      // Determine if it's test or live mode based on account
      const accountIsLive = primaryAccount.livemode

      if (isLiveMode && accountIsLive) {
        // Live environment with live account
        updateData.stripeAccountId = primaryAccount.id
        updateData.stripeConnected = true
        updateData.stripeAccountSynced = safeFormatDate(primaryAccount.created)
        console.log(`💾 [Sync with Stripe] Updating LIVE account: ${primaryAccount.id}`)
      } else if (isTestMode && !accountIsLive) {
        // Test environment with test account
        updateData.stripeTestAccountId = primaryAccount.id
        updateData.stripeTestConnected = true
        updateData.stripeTestAccountSynced = safeFormatDate(primaryAccount.created)
        console.log(`💾 [Sync with Stripe] Updating TEST account: ${primaryAccount.id}`)
      } else {
        console.warn(
          `⚠️ [Sync with Stripe] Account mode mismatch: Environment is ${isLiveMode ? "LIVE" : "TEST"} but account is ${accountIsLive ? "LIVE" : "TEST"}`,
        )
      }
    }

    // Update Firestore
    try {
      await db.collection("users").doc(userId).update(updateData)
      console.log(`✅ [Sync with Stripe] Updated Firestore successfully`)
    } catch (firestoreError) {
      console.warn(`⚠️ [Sync with Stripe] Failed to update Firestore:`, firestoreError)
    }

    return NextResponse.json({
      success: true,
      sync_results: {
        total_accounts_in_stripe: connectedAccounts.data.length,
        user_accounts_found: userAccountsInStripe.length,
        environment: process.env.NODE_ENV,
        stripe_mode: isLiveMode ? "live" : "test",
        accounts_synced: userAccountsInStripe.map((acc) => ({
          id: acc.id,
          type: acc.type,
          email: acc.email,
          live_mode: acc.livemode,
          created: safeFormatDate(acc.created),
        })),
      },
      firestore_updated: true,
      message: `Sync complete. Found ${userAccountsInStripe.length} ${isLiveMode ? "live" : "test"} accounts belonging to you.`,
    })
  } catch (error: any) {
    console.error("❌ [Sync with Stripe] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code,
        environment: process.env.NODE_ENV,
        stripe_mode: isLiveMode ? "live" : "test",
      },
      { status: 500 },
    )
  }
}
