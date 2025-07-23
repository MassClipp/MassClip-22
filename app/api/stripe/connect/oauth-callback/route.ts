import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  console.log(`🔄 [OAuth Callback] Received callback with code: ${!!code}, error: ${error}`)

  if (error) {
    console.error(`❌ [OAuth Callback] OAuth error: ${error}`)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?error=${encodeURIComponent(error)}`,
    )
  }

  if (!code || !state) {
    console.error("❌ [OAuth Callback] Missing code or state parameter")
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?error=missing_parameters`)
  }

  try {
    // Decode state to get user information
    const stateData = JSON.parse(Buffer.from(state, "base64").toString())
    const { userId, mode } = stateData

    console.log(`🔍 [OAuth Callback] Processing callback for user: ${userId}, mode: ${mode}`)

    if (mode !== (isTestMode ? "test" : "live")) {
      console.error(`❌ [OAuth Callback] Mode mismatch: expected ${isTestMode ? "test" : "live"}, got ${mode}`)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?error=mode_mismatch`)
    }

    // Exchange authorization code for access token
    const tokenResponse = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    })

    const accountId = tokenResponse.stripe_user_id
    console.log(`✅ [OAuth Callback] Successfully connected account: ${accountId}`)

    // Get account details to check onboarding status
    const account = await stripe.accounts.retrieve(accountId)

    const isFullyOnboarded =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled &&
      (!account.requirements?.currently_due || account.requirements.currently_due.length === 0)

    console.log(`🔍 [OAuth Callback] Account ${accountId} onboarding status:`, {
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      currently_due: account.requirements?.currently_due?.length || 0,
      isFullyOnboarded,
    })

    // Store account information in Firestore
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"

    await db
      .collection("users")
      .doc(userId)
      .update({
        [accountIdField]: accountId,
        [connectedField]: isFullyOnboarded,
        [`${accountIdField}ConnectedAt`]: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

    if (isFullyOnboarded) {
      console.log(`✅ [OAuth Callback] Account ${accountId} is fully onboarded, redirecting to success`)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?success=true`)
    } else {
      console.log(`🔄 [OAuth Callback] Account ${accountId} needs onboarding, creating account link`)

      // Create account onboarding link for incomplete accounts
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?success=true`,
        type: "account_onboarding",
      })

      console.log(`✅ [OAuth Callback] Created onboarding link for account ${accountId}`)
      return NextResponse.redirect(accountLink.url)
    }
  } catch (error: any) {
    console.error("❌ [OAuth Callback] Error processing callback:", error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?error=${encodeURIComponent("callback_processing_failed")}`,
    )
  }
}
