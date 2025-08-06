import { NextRequest, NextResponse } from 'next/server'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is the user ID
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Stripe OAuth error:', error)
      return NextResponse.redirect(new URL('/dashboard/connect-stripe?error=oauth_failed', request.url))
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing code or state parameter')
      return NextResponse.redirect(new URL('/dashboard/connect-stripe?error=missing_params', request.url))
    }

    const userId = state
    const clientId = process.env.STRIPE_CLIENT_ID
    const clientSecret = process.env.STRIPE_SECRET_KEY

    if (!clientId || !clientSecret) {
      console.error('Missing Stripe configuration')
      return NextResponse.redirect(new URL('/dashboard/connect-stripe?error=config_error', request.url))
    }

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
      console.error('Failed to exchange code for token:', errorData)
      return NextResponse.redirect(new URL('/dashboard/connect-stripe?error=token_exchange_failed', request.url))
    }

    const tokenData = await tokenResponse.json()
    const { stripe_user_id, access_token, refresh_token, livemode, scope } = tokenData

    if (!stripe_user_id || !access_token) {
      console.error('Invalid token response:', tokenData)
      return NextResponse.redirect(new URL('/dashboard/connect-stripe?error=invalid_token', request.url))
    }

    // Fetch account details from Stripe
    const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${stripe_user_id}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Stripe-Version': '2023-10-16',
      },
    })

    if (!accountResponse.ok) {
      console.error('Failed to fetch account details')
      return NextResponse.redirect(new URL('/dashboard/connect-stripe?error=account_fetch_failed', request.url))
    }

    const accountData = await accountResponse.json()

    // Prepare data for Firestore
    const connectionData = {
      userId,
      stripe_user_id,
      access_token,
      refresh_token,
      livemode: livemode || false,
      scope: scope || 'read_write',
      
      // Account status
      charges_enabled: accountData.charges_enabled || false,
      payouts_enabled: accountData.payouts_enabled || false,
      details_submitted: accountData.details_submitted || false,
      
      // Account details
      country: accountData.country || '',
      email: accountData.email || '',
      business_type: accountData.business_type || '',
      default_currency: accountData.default_currency || '',
      
      // Requirements
      requirements: {
        currently_due: accountData.requirements?.currently_due || [],
        past_due: accountData.requirements?.past_due || [],
        pending_verification: accountData.requirements?.pending_verification || [],
      },
      
      // Metadata
      connected: true,
      connectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      
      // Store full account data for reference
      stripeAccountData: accountData,
    }

    // Save to Firestore
    if (!db) {
      console.error('Firestore not initialized')
      return NextResponse.redirect(new URL('/dashboard/connect-stripe?error=database_error', request.url))
    }

    await setDoc(doc(db, 'connectedStripeAccounts', userId), connectionData)

    console.log('Successfully connected Stripe account:', stripe_user_id)

    // Redirect to success page
    return NextResponse.redirect(new URL('/dashboard/earnings?onboarding=success', request.url))

  } catch (error) {
    console.error('Error in OAuth callback:', error)
    return NextResponse.redirect(new URL('/dashboard/connect-stripe?error=callback_error', request.url))
  }
}
