import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    // Handle OAuth errors
    if (error) {
      console.error("❌ [OAuth Callback] Stripe OAuth error:", error)
      const errorDescription = searchParams.get("error_description")
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?error=oauth_failed&message=${encodeURIComponent(errorDescription || error)}`,
      )
    }

    if (!code || !state) {
      console.error("❌ [OAuth Callback] Missing code or state parameter")
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?error=invalid_callback`)
    }

    // Decode and validate state
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString())
      console.log(`🔍 [OAuth Callback] Processing callback for user: ${stateData.userId}`)
    } catch (stateError) {
      console.error("❌ [OAuth Callback] Invalid state parameter:", stateError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?error=invalid_state`)
    }

    const { userId, mode, flow } = stateData

    // Validate mode matches current environment
    const currentMode = isTestMode ? "test" : "live"
    if (mode !== currentMode) {
      console.error(`❌ [OAuth Callback] Mode mismatch: expected ${currentMode}, got ${mode}`)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?error=mode_mismatch`)
    }

    try {
      // Exchange the authorization code for access token and account ID
      const response = await stripe.oauth.token({
        grant_type: "authorization_code",
        code,
      })

      const { stripe_user_id: accountId, access_token } = response

      console.log(`✅ [OAuth Callback] Successfully connected account: ${accountId}`)

      // Get account details to check onboarding status
      const account = await stripe.accounts.retrieve(accountId)

      // Check if the account needs onboarding
      const needsOnboarding =
        !account.details_submitted ||
        !account.charges_enabled ||
        !account.payouts_enabled ||
        (account.requirements?.currently_due && account.requirements.currently_due.length > 0)

      console.log(`🔍 [OAuth Callback] Account ${accountId} onboarding status:`, {
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        currently_due: account.requirements?.currently_due?.length || 0,
        needsOnboarding,
      })

      // Store the account information in Firestore
      const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
      const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"
      const accessTokenField = isTestMode ? "stripeTestAccessToken" : "stripeAccessToken"

      await db
        .collection("users")
        .doc(userId)
        .update({
          [accountIdField]: accountId,
          [accessTokenField]: access_token,
          [connectedField]: !needsOnboarding, // Only mark as connected if fully onboarded
          [`${accountIdField}BusinessType`]: account.business_type || "individual",
          [`${accountIdField}Country`]: account.country,
          [`${accountIdField}DetailsSubmitted`]: account.details_submitted,
          [`${accountIdField}ChargesEnabled`]: account.charges_enabled,
          [`${accountIdField}PayoutsEnabled`]: account.payouts_enabled,
          [`${accountIdField}ConnectedAt`]: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

      // If the account needs onboarding, create an account link to complete setup
      if (needsOnboarding) {
        console.log(`🔄 [OAuth Callback] Account ${accountId} needs onboarding, creating account link`)

        const accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?refresh=true`,
          return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?success=true`,
          type: "account_onboarding",
        })

        console.log(`🔗 [OAuth Callback] Redirecting to onboarding: ${accountLink.url}`)
        return NextResponse.redirect(accountLink.url)
      } else {
        // Account is fully set up, redirect to success page
        console.log(`✅ [OAuth Callback] Account ${accountId} is fully onboarded, redirecting to success`)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?success=true&connected=true`,
        )
      }
    } catch (stripeError: any) {
      console.error("❌ [OAuth Callback] Stripe API error:", stripeError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?error=stripe_error&message=${encodeURIComponent(stripeError.message)}`,
      )
    }
  } catch (error: any) {
    console.error("❌ [OAuth Callback] Unexpected error:", error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?error=callback_failed&message=${encodeURIComponent(error.message)}`,
    )
  }
}
