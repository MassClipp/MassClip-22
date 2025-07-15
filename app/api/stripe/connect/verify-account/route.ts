import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

interface VerifyAccountBody {
  accountId: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await requireAuth(request)
    const userId = decodedToken.uid
    console.log(`🔍 [Verify Account] Request from user: ${userId}`)

    const { accountId } = (await request.json()) as VerifyAccountBody

    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: "Account ID is required",
        },
        { status: 400 },
      )
    }

    // Get account details directly from Stripe
    const account = await stripe.accounts.retrieve(accountId)
    console.log(`📊 [Verify Account] Retrieved account: ${account.id}`)

    // Check if this account is actually connected to our platform
    const connectedAccounts = await stripe.accounts.list({
      limit: 100,
    })

    const isConnectedToPlatform = connectedAccounts.data.some((acc) => acc.id === accountId)

    // Get user's stored account info from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.exists ? userDoc.data() : {}

    const storedTestAccountId = userData?.stripeTestAccountId
    const storedLiveAccountId = userData?.stripeAccountId

    return NextResponse.json({
      success: true,
      verification: {
        account_exists_in_stripe: true,
        account_connected_to_platform: isConnectedToPlatform,
        account_matches_stored_test_id: storedTestAccountId === accountId,
        account_matches_stored_live_id: storedLiveAccountId === accountId,
      },
      stripe_account_details: {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
        created: new Date(account.created * 1000).toISOString(),
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          past_due: account.requirements?.past_due || [],
          pending_verification: account.requirements?.pending_verification || [],
          disabled_reason: account.requirements?.disabled_reason,
        },
        capabilities: account.capabilities,
        metadata: account.metadata,
        business_profile: account.business_profile,
      },
      stored_user_data: {
        stripe_test_account_id: storedTestAccountId,
        stripe_live_account_id: storedLiveAccountId,
        stripe_test_connected: userData?.stripeTestConnected || false,
        stripe_connected: userData?.stripeConnected || false,
      },
      platform_connected_accounts_count: connectedAccounts.data.length,
    })
  } catch (error: any) {
    console.error("❌ [Verify Account] Error:", error)

    if (error.type === "StripeInvalidRequestError" && error.code === "resource_missing") {
      return NextResponse.json({
        success: false,
        error: "Account not found in Stripe",
        verification: {
          account_exists_in_stripe: false,
          account_connected_to_platform: false,
        },
      })
    }

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
