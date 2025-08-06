import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    console.log('🔄 [Stripe Connect Callback] Processing OAuth callback:', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      state: state?.slice(0, 8) + '...',
    })

    // Handle OAuth errors from Stripe
    if (error) {
      console.error('❌ [Stripe Connect] OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/dashboard/connect-stripe?error=oauth_error&message=${encodeURIComponent(errorDescription || error)}`, request.url)
      )
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('❌ [Stripe Connect] Missing required parameters:', { code: !!code, state: !!state })
      return NextResponse.redirect(
        new URL('/dashboard/connect-stripe?error=missing_params&message=Missing authorization code or state', request.url)
      )
    }

    // Validate state (user UID)
    const userUID = state.trim()
    if (!userUID || userUID.length < 10 || userUID.length > 128) {
      console.error('❌ [Stripe Connect] Invalid user UID format:', userUID?.length)
      return NextResponse.redirect(
        new URL('/dashboard/connect-stripe?error=invalid_state&message=Invalid user identifier', request.url)
      )
    }

    // Check if user exists
    try {
      const userDoc = await adminDb.collection('users').doc(userUID).get()
      if (!userDoc.exists) {
        console.error('❌ [Stripe Connect] User not found:', userUID)
        return NextResponse.redirect(
          new URL('/dashboard/connect-stripe?error=user_not_found&message=User account not found', request.url)
        )
      }
    } catch (error) {
      console.error('❌ [Stripe Connect] Error checking user existence:', error)
      return NextResponse.redirect(
        new URL('/dashboard/connect-stripe?error=database_error&message=Failed to verify user account', request.url)
      )
    }

    // Exchange authorization code for access token
    let tokenData
    try {
      console.log('🔄 [Stripe Connect] Exchanging authorization code for tokens...')
      
      const response = await fetch('https://connect.stripe.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_secret: process.env.STRIPE_SECRET_KEY!,
          code: code,
          grant_type: 'authorization_code',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [Stripe Connect] Token exchange failed:', response.status, errorText)
        throw new Error(`Token exchange failed: ${response.status}`)
      }

      tokenData = await response.json()
      console.log('✅ [Stripe Connect] Token exchange successful:', {
        stripeUserId: tokenData.stripe_user_id?.slice(0, 8) + '...',
        livemode: tokenData.livemode,
        scope: tokenData.scope,
      })
    } catch (error) {
      console.error('❌ [Stripe Connect] Token exchange error:', error)
      return NextResponse.redirect(
        new URL('/dashboard/connect-stripe?error=token_exchange&message=Failed to exchange authorization code', request.url)
      )
    }

    // Get account details from Stripe
    let accountDetails
    try {
      console.log('🔄 [Stripe Connect] Fetching account details from Stripe...')
      accountDetails = await stripe.accounts.retrieve(tokenData.stripe_user_id)
      console.log('✅ [Stripe Connect] Account details retrieved:', {
        id: accountDetails.id,
        chargesEnabled: accountDetails.charges_enabled,
        payoutsEnabled: accountDetails.payouts_enabled,
        detailsSubmitted: accountDetails.details_submitted,
      })
    } catch (error) {
      console.error('❌ [Stripe Connect] Failed to fetch account details:', error)
      return NextResponse.redirect(
        new URL('/dashboard/connect-stripe?error=account_fetch&message=Failed to fetch account details', request.url)
      )
    }

    // Prepare account data for Firestore
    const accountData = {
      // OAuth tokens
      stripe_user_id: tokenData.stripe_user_id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      livemode: tokenData.livemode || false,
      scope: tokenData.scope || 'read_write',
      
      // Account metadata
      charges_enabled: accountDetails.charges_enabled || false,
      payouts_enabled: accountDetails.payouts_enabled || false,
      details_submitted: accountDetails.details_submitted || false,
      country: accountDetails.country || '',
      email: accountDetails.email || '',
      business_type: accountDetails.business_type || '',
      type: accountDetails.type || '',
      default_currency: accountDetails.default_currency || 'usd',
      
      // Platform metadata
      userId: userUID,
      connected: true,
      connectedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      
      // Additional metadata
      business_profile: accountDetails.business_profile ? {
        name: accountDetails.business_profile.name || null,
        url: accountDetails.business_profile.url || null,
        support_email: accountDetails.business_profile.support_email || null,
      } : null,
      
      requirements: accountDetails.requirements ? {
        currently_due: accountDetails.requirements.currently_due || [],
        past_due: accountDetails.requirements.past_due || [],
        pending_verification: accountDetails.requirements.pending_verification || [],
      } : null,
    }

    // Validate account data before saving
    if (!accountData.stripe_user_id || !accountData.access_token || !accountData.userId) {
      console.error('❌ [Stripe Connect] Invalid account data:', {
        hasStripeUserId: !!accountData.stripe_user_id,
        hasAccessToken: !!accountData.access_token,
        hasUserId: !!accountData.userId,
      })
      return NextResponse.redirect(
        new URL('/dashboard/connect-stripe?error=invalid_data&message=Invalid account data received', request.url)
      )
    }

    // Save to Firestore
    try {
      console.log('🔄 [Stripe Connect] Saving account data to Firestore...')
      
      const docRef = adminDb.collection('connectedStripeAccounts').doc(userUID)
      
      // Check if document already exists
      const existingDoc = await docRef.get()
      
      if (existingDoc.exists) {
        // Update existing document
        await docRef.update({
          ...accountData,
          updatedAt: FieldValue.serverTimestamp(),
        })
        console.log('✅ [Stripe Connect] Updated existing connected account')
      } else {
        // Create new document
        await docRef.set({
          ...accountData,
          createdAt: FieldValue.serverTimestamp(),
        })
        console.log('✅ [Stripe Connect] Created new connected account')
      }

      // Also update user document for backward compatibility
      await adminDb.collection('users').doc(userUID).update({
        stripeAccountId: tokenData.stripe_user_id,
        stripeAccountStatus: accountDetails.details_submitted ? 'active' : 'pending',
        stripeChargesEnabled: accountDetails.charges_enabled,
        stripePayoutsEnabled: accountDetails.payouts_enabled,
        stripeDetailsSubmitted: accountDetails.details_submitted,
        updatedAt: FieldValue.serverTimestamp(),
      })
      
      console.log('✅ [Stripe Connect] Updated user document for backward compatibility')
      
    } catch (error) {
      console.error('❌ [Stripe Connect] Failed to save account data:', error)
      return NextResponse.redirect(
        new URL('/dashboard/connect-stripe?error=save_failed&message=Failed to save account connection', request.url)
      )
    }

    // Success! Redirect to earnings page
    console.log('🎉 [Stripe Connect] OAuth flow completed successfully for user:', userUID)
    return NextResponse.redirect(
      new URL('/dashboard/earnings?onboarding=success', request.url)
    )

  } catch (error) {
    console.error('❌ [Stripe Connect] Unexpected error in OAuth callback:', error)
    return NextResponse.redirect(
      new URL('/dashboard/connect-stripe?error=unexpected&message=An unexpected error occurred', request.url)
    )
  }
}
