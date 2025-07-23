import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    console.log(`🔄 [OAuth Callback] Received callback with:`, {
      hasCode: !!code,
      hasState: !!state,
      error,
      errorDescription,
      mode: isTestMode ? "test" : "live",
    })

    // Handle OAuth errors
    if (error) {
      console.error("❌ [OAuth Callback] OAuth error:", error, errorDescription)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL
      return NextResponse.redirect(
        `${baseUrl}/dashboard/earnings?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`,
      )
    }

    if (!code || !state) {
      console.error("❌ [OAuth Callback] Missing code or state parameter")
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=missing_parameters`)
    }

    // Decode and validate state
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString())
      console.log("✅ [OAuth Callback] State decoded:", {
        userId: stateData.userId,
        flow: stateData.flow,
        mode: stateData.mode,
      })
    } catch (error) {
      console.error("❌ [OAuth Callback] Invalid state parameter:", error)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=invalid_state`)
    }

    const { userId, mode } = stateData

    // Validate mode matches current environment
    const expectedMode = isTestMode ? "test" : "live"
    if (mode !== expectedMode) {
      console.error(`❌ [OAuth Callback] Mode mismatch: expected ${expectedMode}, got ${mode}`)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=mode_mismatch`)
    }

    // Use single STRIPE_CLIENT_ID
    const clientId = process.env.STRIPE_CLIENT_ID
    if (!clientId) {
      console.error("❌ [OAuth Callback] Missing STRIPE_CLIENT_ID")
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=missing_client_id`)
    }

    // Exchange authorization code for access token
    console.log(`🔄 [OAuth Callback] Exchanging code for access token...`)

    const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_secret: process.env.STRIPE_SECRET_KEY!,
        code,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("❌ [OAuth Callback] Token exchange failed:", errorText)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=token_exchange_failed`)
    }

    const tokenData = await tokenResponse.json()
    const { stripe_user_id: accountId, access_token } = tokenData

    console.log(`✅ [OAuth Callback] Token exchange successful:`, {
      accountId,
      hasAccessToken: !!access_token,
    })

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(accountId)

    console.log(`✅ [OAuth Callback] Account retrieved:`, {
      accountId: account.id,
      country: account.country,
      email: account.email,
      type: account.type,
      business_type: account.business_type,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    })

    // Determine field names based on mode
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"
    const detailsField = isTestMode ? "stripeTestAccountDetails" : "stripeAccountDetails"

    // Prepare account details for storage
    const accountDetails = {
      id: account.id,
      country: account.country,
      email: account.email,
      type: account.type,
      business_type: account.business_type,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: {
        currently_due: account.requirements?.currently_due || [],
        eventually_due: account.requirements?.eventually_due || [],
        past_due: account.requirements?.past_due || [],
        pending_verification: account.requirements?.pending_verification || [],
      },
      connectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }

    // Check if account is fully onboarded
    const isFullyOnboarded =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled &&
      (!account.requirements?.currently_due || account.requirements.currently_due.length === 0) &&
      (!account.requirements?.past_due || account.requirements.past_due.length === 0)

    console.log(`🔍 [OAuth Callback] Account onboarding status:`, {
      isFullyOnboarded,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      currently_due: account.requirements?.currently_due?.length || 0,
      past_due: account.requirements?.past_due?.length || 0,
    })

    // Update user record in Firestore
    await db
      .collection("users")
      .doc(userId)
      .update({
        [accountIdField]: accountId,
        [connectedField]: isFullyOnboarded,
        [detailsField]: accountDetails,
        updatedAt: new Date().toISOString(),
      })

    console.log(`✅ [OAuth Callback] User ${userId} updated with account ${accountId}`)

    // Redirect based on onboarding status
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL

    if (isFullyOnboarded) {
      console.log(`🎉 [OAuth Callback] Account fully onboarded, redirecting to success`)
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?success=true`)
    } else {
      console.log(`⏳ [OAuth Callback] Account needs completion, redirecting to refresh`)
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?refresh=true`)
    }
  } catch (error: any) {
    console.error("❌ [OAuth Callback] Unexpected error:", error)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL
    return NextResponse.redirect(
      `${baseUrl}/dashboard/earnings?error=callback_error&details=${encodeURIComponent(error.message)}`,
    )
  }
}
