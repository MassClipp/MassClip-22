import { NextRequest, NextResponse } from 'next/server'
import { storeConnectedAccount } from '@/lib/stripe/storeConnectedAccount'

export async function GET(request: NextRequest) {
  const debugLog: any[] = []
  
  try {
    debugLog.push({ step: 1, action: 'Starting OAuth callback processing', timestamp: new Date().toISOString() })
    
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    debugLog.push({ 
      step: 2, 
      action: 'Extracted URL parameters', 
      data: { 
        hasCode: !!code, 
        hasState: !!state, 
        error, 
        errorDescription,
        fullUrl: request.url
      },
      timestamp: new Date().toISOString()
    })

    console.log('🔄 [OAuth Callback] Processing Stripe Connect callback')
    console.log('📋 [OAuth Callback] URL:', request.url)
    console.log('📋 [OAuth Callback] Params:', { code: !!code, state: !!state, error, errorDescription })

    // Handle OAuth errors from Stripe
    if (error) {
      debugLog.push({ step: 3, action: 'OAuth error detected', error, errorDescription, timestamp: new Date().toISOString() })
      console.error('❌ [OAuth Callback] Stripe OAuth error:', error, errorDescription)
      
      return NextResponse.redirect(
        new URL(`/dashboard/connect-stripe?error=oauth_failed&message=${encodeURIComponent(errorDescription || error)}&debug=${encodeURIComponent(JSON.stringify(debugLog))}`, request.url)
      )
    }

    // Validate required parameters
    if (!code || !state) {
      debugLog.push({ step: 3, action: 'Missing required parameters', data: { code: !!code, state: !!state }, timestamp: new Date().toISOString() })
      console.error('❌ [OAuth Callback] Missing required parameters')
      
      return NextResponse.redirect(
        new URL(`/dashboard/connect-stripe?error=missing_params&debug=${encodeURIComponent(JSON.stringify(debugLog))}`, request.url)
      )
    }

    const userId = state
    debugLog.push({ step: 4, action: 'Extracted user ID', data: { userId }, timestamp: new Date().toISOString() })

    // Check environment variables
    const clientSecret = process.env.STRIPE_SECRET_KEY
    const clientId = process.env.STRIPE_CLIENT_ID

    if (!clientSecret) {
      debugLog.push({ step: 5, action: 'Missing STRIPE_SECRET_KEY', timestamp: new Date().toISOString() })
      console.error('❌ [OAuth Callback] Missing STRIPE_SECRET_KEY')
      
      return NextResponse.redirect(
        new URL(`/dashboard/connect-stripe?error=config_error&message=Missing STRIPE_SECRET_KEY&debug=${encodeURIComponent(JSON.stringify(debugLog))}`, request.url)
      )
    }

    if (!clientId) {
      debugLog.push({ step: 5, action: 'Missing STRIPE_CLIENT_ID', timestamp: new Date().toISOString() })
      console.error('❌ [OAuth Callback] Missing STRIPE_CLIENT_ID')
      
      return NextResponse.redirect(
        new URL(`/dashboard/connect-stripe?error=config_error&message=Missing STRIPE_CLIENT_ID&debug=${encodeURIComponent(JSON.stringify(debugLog))}`, request.url)
      )
    }

    debugLog.push({ step: 5, action: 'Environment variables validated', timestamp: new Date().toISOString() })

    console.log('🔄 [OAuth Callback] Exchanging code for access token')
    debugLog.push({ step: 6, action: 'Starting token exchange', timestamp: new Date().toISOString() })

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

    debugLog.push({ 
      step: 7, 
      action: 'Token exchange response received', 
      data: { 
        status: tokenResponse.status, 
        statusText: tokenResponse.statusText,
        ok: tokenResponse.ok
      },
      timestamp: new Date().toISOString()
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      debugLog.push({ step: 8, action: 'Token exchange failed', error: errorData, timestamp: new Date().toISOString() })
      console.error('❌ [OAuth Callback] Token exchange failed:', errorData)
      
      return NextResponse.redirect(
        new URL(`/dashboard/connect-stripe?error=token_exchange_failed&message=${encodeURIComponent(errorData)}&debug=${encodeURIComponent(JSON.stringify(debugLog))}`, request.url)
      )
    }

    const oauthData = await tokenResponse.json()
    debugLog.push({ 
      step: 8, 
      action: 'Token exchange successful', 
      data: { 
        hasStripeUserId: !!oauthData.stripe_user_id,
        hasAccessToken: !!oauthData.access_token,
        livemode: oauthData.livemode,
        scope: oauthData.scope
      },
      timestamp: new Date().toISOString()
    })
    console.log('✅ [OAuth Callback] Token exchange successful')

    // Validate OAuth response
    if (!oauthData.stripe_user_id || !oauthData.access_token) {
      debugLog.push({ step: 9, action: 'Invalid OAuth response', data: oauthData, timestamp: new Date().toISOString() })
      console.error('❌ [OAuth Callback] Invalid OAuth response:', oauthData)
      
      return NextResponse.redirect(
        new URL(`/dashboard/connect-stripe?error=invalid_oauth_response&debug=${encodeURIComponent(JSON.stringify(debugLog))}`, request.url)
      )
    }

    console.log('🔄 [OAuth Callback] Fetching account details')
    debugLog.push({ step: 9, action: 'Starting account details fetch', data: { stripeUserId: oauthData.stripe_user_id }, timestamp: new Date().toISOString() })

    // Fetch account details from Stripe
    const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${oauthData.stripe_user_id}`, {
      headers: {
        'Authorization': `Bearer ${oauthData.access_token}`,
        'Stripe-Version': '2023-10-16',
      },
    })

    debugLog.push({ 
      step: 10, 
      action: 'Account details response received', 
      data: { 
        status: accountResponse.status, 
        statusText: accountResponse.statusText,
        ok: accountResponse.ok
      },
      timestamp: new Date().toISOString()
    })

    if (!accountResponse.ok) {
      const errorData = await accountResponse.text()
      debugLog.push({ step: 11, action: 'Account fetch failed', error: errorData, timestamp: new Date().toISOString() })
      console.error('❌ [OAuth Callback] Failed to fetch account details:', errorData)
      
      return NextResponse.redirect(
        new URL(`/dashboard/connect-stripe?error=account_fetch_failed&message=${encodeURIComponent(errorData)}&debug=${encodeURIComponent(JSON.stringify(debugLog))}`, request.url)
      )
    }

    const accountData = await accountResponse.json()
    debugLog.push({ 
      step: 11, 
      action: 'Account details retrieved', 
      data: {
        accountId: accountData.id,
        chargesEnabled: accountData.charges_enabled,
        payoutsEnabled: accountData.payouts_enabled,
        detailsSubmitted: accountData.details_submitted,
        country: accountData.country
      },
      timestamp: new Date().toISOString()
    })
    console.log('✅ [OAuth Callback] Retrieved account details')

    console.log('🔄 [OAuth Callback] Storing connected account data')
    debugLog.push({ step: 12, action: 'Starting data storage', timestamp: new Date().toISOString() })

    // Store the connected account data using our utility
    try {
      const storedData = await storeConnectedAccount(userId, oauthData, accountData, {
        updateUserRecord: true
      })
      
      debugLog.push({ 
        step: 13, 
        action: 'Data storage successful', 
        data: { 
          userId: storedData.userId,
          stripeUserId: storedData.stripe_user_id,
          connected: storedData.connected
        },
        timestamp: new Date().toISOString()
      })
      console.log('✅ [OAuth Callback] Successfully stored connected account data')
      
    } catch (storageError) {
      debugLog.push({ step: 13, action: 'Data storage failed', error: storageError, timestamp: new Date().toISOString() })
      console.error('❌ [OAuth Callback] Storage error:', storageError)
      
      return NextResponse.redirect(
        new URL(`/dashboard/connect-stripe?error=storage_failed&message=${encodeURIComponent(String(storageError))}&debug=${encodeURIComponent(JSON.stringify(debugLog))}`, request.url)
      )
    }

    debugLog.push({ step: 14, action: 'Redirecting to success page', timestamp: new Date().toISOString() })
    console.log('✅ [OAuth Callback] Process completed successfully, redirecting to earnings')

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/dashboard/earnings?onboarding=success&debug=${encodeURIComponent(JSON.stringify(debugLog))}`, request.url)
    )

  } catch (error) {
    debugLog.push({ step: 'ERROR', action: 'Unexpected error caught', error: String(error), timestamp: new Date().toISOString() })
    console.error('❌ [OAuth Callback] Unexpected error:', error)
    
    return NextResponse.redirect(
      new URL(`/dashboard/connect-stripe?error=callback_error&message=${encodeURIComponent(String(error))}&debug=${encodeURIComponent(JSON.stringify(debugLog))}`, request.url)
    )
  }
}
