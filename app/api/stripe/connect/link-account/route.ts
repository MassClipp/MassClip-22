import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { userId, accountId } = await request.json()

    if (!userId || !accountId) {
      return NextResponse.json({ error: "User ID and Account ID are required" }, { status: 400 })
    }

    console.log(`🔄 [Link Account] Creating account link for user ${userId}, account ${accountId}`)

    // Verify the account exists and get its details
    let account
    try {
      account = await stripe.accounts.retrieve(accountId)
    } catch (stripeError: any) {
      console.error(`❌ [Link Account] Invalid account ID ${accountId}:`, stripeError)
      return NextResponse.json({ error: "Invalid account ID" }, { status: 400 })
    }

    // Validate account environment matches our platform
    const environmentMismatch = (isTestMode && account.livemode) || (!isTestMode && !account.livemode)
    if (environmentMismatch) {
      console.error(
        `❌ [Link Account] Environment mismatch: Platform is in ${isTestMode ? "test" : "live"} mode but account is in ${account.livemode ? "live" : "test"} mode`,
      )
      return NextResponse.json(
        {
          error: `Account mode (${account.livemode ? "live" : "test"}) does not match platform mode (${isTestMode ? "test" : "live"})`,
        },
        { status: 400 },
      )
    }

    // Create account link for onboarding/re-onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?success=true&account=${accountId}`,
      type: "account_onboarding",
    })

    console.log(`✅ [Link Account] Created account link for ${accountId}`)

    // Save account info to database
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"
    const detailsField = isTestMode ? "stripeTestAccountDetails" : "stripeAccountDetails"

    const accountDetails = {
      id: accountId,
      country: account.country,
      email: account.email,
      type: account.type,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirementsCurrentlyDue: account.requirements?.currently_due || [],
      requirementsEventuallyDue: account.requirements?.eventually_due || [],
      connectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }

    await db
      .collection("users")
      .doc(userId)
      .update({
        [accountIdField]: accountId,
        [connectedField]: true,
        [detailsField]: accountDetails,
        updatedAt: new Date().toISOString(),
      })

    return NextResponse.json({
      url: accountLink.url,
      accountId,
      mode: isTestMode ? "test" : "live",
    })
  } catch (error: any) {
    console.error("❌ [Link Account] Error creating account link:", error)
    return NextResponse.json({ error: "Failed to create account link", details: error.message }, { status: 500 })
  }
}
