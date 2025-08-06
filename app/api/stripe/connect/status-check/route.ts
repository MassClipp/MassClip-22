import { type NextRequest, NextResponse } from "next/server"
import { getConnectedStripeAccount, refreshStripeAccountData } from "@/lib/connected-stripe-accounts-service"

export async function POST(request: NextRequest) {
  try {
    const { userId, refresh = false } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Status Check] Checking connection status for user: ${userId}`)

    let account = await getConnectedStripeAccount(userId)

    // If refresh is requested and account exists, get fresh data from Stripe
    if (refresh && account) {
      console.log(`🔄 [Status Check] Refreshing data from Stripe for user: ${userId}`)
      try {
        account = await refreshStripeAccountData(userId)
      } catch (refreshError) {
        console.error(`❌ [Status Check] Failed to refresh data for user ${userId}:`, refreshError)
        // Continue with existing data if refresh fails
      }
    }

    if (!account) {
      console.log(`ℹ️ [Status Check] No connected account found for user: ${userId}`)
      return NextResponse.json({
        connected: false,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "not_connected"
      })
    }

    console.log(`✅ [Status Check] Found connected account for user: ${userId}`)

    return NextResponse.json({
      connected: account.connected,
      accountId: account.stripe_user_id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      status: account.charges_enabled && account.details_submitted ? "active" : "pending",
      country: account.country,
      email: account.email,
      businessType: account.business_type,
      defaultCurrency: account.default_currency,
      livemode: account.livemode,
      requirements: account.requirements,
      businessProfile: account.business_profile,
    })

  } catch (error) {
    console.error("❌ [Status Check] Error checking connection status:", error)
    return NextResponse.json(
      { error: "Failed to check connection status" },
      { status: 500 }
    )
  }
}
