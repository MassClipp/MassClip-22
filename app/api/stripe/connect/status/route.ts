import { type NextRequest, NextResponse } from "next/server"
import { getConnectedAccount, refreshConnectedAccount } from "@/lib/stripe-connect-service"

export async function POST(request: NextRequest) {
  try {
    const { userId, refresh = false } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`🔍 Checking Stripe connection status for user: ${userId}`)

    let account
    if (refresh) {
      console.log("🔄 Refreshing account data from Stripe...")
      account = await refreshConnectedAccount(userId)
    } else {
      account = await getConnectedAccount(userId)
    }

    if (!account) {
      console.log("ℹ️ No connected Stripe account found")
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "not_connected",
      })
    }

    console.log(`✅ Found connected account: ${account.stripe_user_id}`)
    
    return NextResponse.json({
      connected: true,
      accountId: account.stripe_user_id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      status: account.details_submitted ? "active" : "pending",
      country: account.country,
      email: account.email,
      businessType: account.business_type,
      defaultCurrency: account.default_currency,
      requirements: account.requirements,
      livemode: account.livemode,
    })
    
  } catch (error) {
    console.error("❌ Error checking Stripe status:", error)
    return NextResponse.json(
      { error: "Failed to check connection status" },
      { status: 500 }
    )
  }
}
