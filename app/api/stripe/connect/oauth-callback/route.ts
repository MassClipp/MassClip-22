import { NextRequest, NextResponse } from 'next/server'
import { storeConnectedAccount } from '@/lib/stripe/storeConnectedAccount'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is the user ID
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    console.log('🔄 [OAuth Callback] Processing Stripe Connect callback')

    // Handle OAuth errors
    if (error) {
      console.error('❌ [OAuth Callback] Stripe OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/dashboard/connect-stripe?error=oauth_failed&message=${encodeURIComponent(errorDescription || error)}`, request.url)
      )
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('❌ [OAuth Callback] Missing required parameters')
      return NextResponse.redirect(
        new URL('/dashboard/connect-stripe?error=missing_params', request.url)
      )
    }

    const userId = state
    const clientSecret = process.env.STRIPE_SECRET_KEY

    if (!clientSecret) {
      console.error('❌ [OAuth Callback] Missing Stripe configuration')
      return NextResponse.redirect(
        new URL('/dashboard/connect-stripe?error=config_error', request.url)
      )
    }

    console.log('🔄 [OAuth Callback] Exchanging code for access token')

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('❌ [OAuth Callback] Token exchange failed:', errorData)
      return NextResponse.redirect(
        new URL('/dashboard/connect-stripe?error=token_exchange_failed', request.url)
      )
    }

    const oauthData = await tokenResponse.json()
    console.log('✅ [OAuth Callback] Token exchange successful')

    // Fetch account details from Stripe
    const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${oauthData.stripe_user_id}`, {
      headers: {
        'Authorization': `Bearer ${oauthData.access_token}`,
        'Stripe-Version': '2023-10-16',
      },
    })

    if (!accountResponse.ok) {
      const errorData = await accountResponse.text()
      console.error('❌ [OAuth Callback] Failed to fetch account details:', errorData)
      return NextResponse.redirect(
        new URL('/dashboard/connect-stripe?error=account_fetch_failed', request.url)
      )
    }

    const accountData = await accountResponse.json()
    console.log('✅ [OAuth Callback] Retrieved account details')

    // Store the connected account data using our utility
    await storeConnectedAccount(userId, oauthData, accountData, {
      updateUserRecord: true
    })

    console.log('✅ [OAuth Callback] Successfully stored connected account data')

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/dashboard/earnings?onboarding=success', request.url)
    )

  } catch (error) {
    console.error('❌ [OAuth Callback] Unexpected error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/connect-stripe?error=callback_error', request.url)
    )
  }
}
