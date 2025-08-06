import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 [Stripe Callback] Processing OAuth callback...")

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      console.error("❌ [Stripe Callback] OAuth error:", error, errorDescription)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
      return NextResponse.redirect(
        `${baseUrl}/dashboard/connect-stripe?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || 'OAuth authorization failed')}`
      )
    }

    if (!code || !state) {
      console.error("❌ [Stripe Callback] Missing code or state parameter")
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
      return NextResponse.redirect(
        `${baseUrl}/dashboard/connect-stripe?error=missing_params&message=${encodeURIComponent('Missing authorization code or state')}`
      )
    }

    // Decode state to get user info
    let stateData: { userId: string; returnUrl: string }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch (decodeError) {
      console.error("❌ [Stripe Callback] Invalid state parameter:", decodeError)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
      return NextResponse.redirect(
        `${baseUrl}/dashboard/connect-stripe?error=invalid_state&message=${encodeURIComponent('Invalid state parameter')}`
      )
    }

    const { userId, returnUrl } = stateData

    console.log(`🔄 [Stripe Callback] Processing callback for user: ${userId}`)

    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    })

    const stripeAccountId = response.stripe_user_id
    console.log(`✅ [Stripe Callback] Successfully connected account: ${stripeAccountId}`)

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId)

    // Save to connectedStripeAccounts collection
    await adminDb.collection("connectedStripeAccounts").doc(userId).set({
      stripeAccountId: stripeAccountId,
      userId: userId,
      email: account.email || "",
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      country: account.country,
      business_type: account.business_type,
      default_currency: account.default_currency,
      requirements: account.requirements?.currently_due || [],
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      tokenType: response.token_type,
      scope: response.scope,
      livemode: response.livemode,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log(`✅ [Stripe Callback] Saved account to connectedStripeAccounts collection`)

    // Redirect to success page
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
    const redirectUrl = `${baseUrl}${returnUrl}`
    
    console.log(`🔄 [Stripe Callback] Redirecting to: ${redirectUrl}`)
    return NextResponse.redirect(redirectUrl)

  } catch (error: any) {
    console.error("❌ [Stripe Callback] Error processing callback:", error)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
    return NextResponse.redirect(
      `${baseUrl}/dashboard/connect-stripe?error=callback_failed&message=${encodeURIComponent(error.message || 'Failed to process OAuth callback')}`
    )
  }
}
