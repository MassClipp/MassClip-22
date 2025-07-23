import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  console.log("🔄 [OAuth Callback] Processing OAuth callback", {
    hasCode: !!code,
    hasState: !!state,
    hasError: !!error,
    error,
    errorDescription,
  })

  // Handle OAuth errors
  if (error) {
    console.error("❌ [OAuth Callback] OAuth error:", error, errorDescription)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"
    return NextResponse.redirect(
      `${baseUrl}/dashboard/earnings?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || "")}`,
    )
  }

  if (!code || !state) {
    console.error("❌ [OAuth Callback] Missing code or state parameter")
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"
    return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=missing_parameters`)
  }

  try {
    // Decode and validate state
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString())
      console.log("✅ [OAuth Callback] State decoded:", { userId: stateData.userId, flow: stateData.flow })
    } catch (error) {
      console.error("❌ [OAuth Callback] Invalid state parameter:", error)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=invalid_state`)
    }

    const { userId, timestamp, mode, flow } = stateData

    // Validate state timestamp (prevent replay attacks)
    const stateAge = Date.now() - timestamp
    if (stateAge > 10 * 60 * 1000) {
      // 10 minutes
      console.error("❌ [OAuth Callback] State expired:", stateAge)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=state_expired`)
    }

    // Validate mode matches current environment
    const currentMode = isTestMode ? "test" : "live"
    if (mode !== currentMode) {
      console.error("❌ [OAuth Callback] Mode mismatch:", { stateMode: mode, currentMode })
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=mode_mismatch`)
    }

    // Exchange authorization code for access token
    console.log("🔄 [OAuth Callback] Exchanging code for access token")

    const clientSecret = isTestMode
      ? process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY

    if (!clientSecret) {
      console.error("❌ [OAuth Callback] Missing Stripe secret key")
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=missing_secret_key`)
    }

    const tokenResponse = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    })

    console.log("✅ [OAuth Callback] Token exchange successful:", {
      accountId: tokenResponse.stripe_user_id,
      scope: tokenResponse.scope,
    })

    const accountId = tokenResponse.stripe_user_id
    const accessToken = tokenResponse.access_token
    const refreshToken = tokenResponse.refresh_token

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(accountId)

    console.log("🔍 [OAuth Callback] Account details:", {
      accountId,
      email: account.email,
      country: account.country,
      business_type: account.business_type,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements_due: account.requirements?.currently_due?.length || 0,
    })

    // Store account information in Firestore
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"
    const tokenField = isTestMode ? "stripeTestAccessToken" : "stripeAccessToken"
    const refreshTokenField = isTestMode ? "stripeTestRefreshToken" : "stripeRefreshToken"

    // Determine if account is fully onboarded
    const isFullyOnboarded =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled &&
      (!account.requirements?.currently_due || account.requirements.currently_due.length === 0) &&
      (!account.requirements?.past_due || account.requirements.past_due.length === 0)

    console.log("💾 [OAuth Callback] Storing account data:", {
      userId,
      accountId,
      isFullyOnboarded,
      field: accountIdField,
    })

    await db
      .collection("users")
      .doc(userId)
      .update({
        [accountIdField]: accountId,
        [connectedField]: isFullyOnboarded,
        [tokenField]: accessToken,
        [refreshTokenField]: refreshToken,
        [`${accountIdField}ConnectedAt`]: new Date().toISOString(),
        stripeAccountEmail: account.email,
        stripeAccountCountry: account.country,
        stripeBusinessType: account.business_type,
        updatedAt: new Date().toISOString(),
      })

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"

    // If account needs onboarding, redirect to Stripe's onboarding flow
    if (!isFullyOnboarded) {
      console.log("🔄 [OAuth Callback] Account needs onboarding, creating account link")

      try {
        const accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${baseUrl}/dashboard/earnings?refresh=true`,
          return_url: `${baseUrl}/dashboard/earnings?success=true`,
          type: "account_onboarding",
        })

        console.log("✅ [OAuth Callback] Redirecting to onboarding:", accountLink.url)
        return NextResponse.redirect(accountLink.url)
      } catch (linkError: any) {
        console.error("❌ [OAuth Callback] Failed to create account link:", linkError)
        return NextResponse.redirect(
          `${baseUrl}/dashboard/earnings?error=onboarding_failed&details=${encodeURIComponent(linkError.message)}`,
        )
      }
    }

    // Account is fully onboarded, redirect to success page
    console.log("✅ [OAuth Callback] Account fully onboarded, redirecting to success")
    return NextResponse.redirect(`${baseUrl}/dashboard/earnings?success=true&connected=true`)
  } catch (error: any) {
    console.error("❌ [OAuth Callback] Unexpected error:", error)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"
    return NextResponse.redirect(
      `${baseUrl}/dashboard/earnings?error=callback_failed&details=${encodeURIComponent(error.message)}`,
    )
  }
}
