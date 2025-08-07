import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { auth } from 'firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log(`🔍 Checking Stripe connection status for user: ${userId}`)

    // Get the connected Stripe account from Firestore
    const accountDoc = await adminDb.collection('connectedStripeAccounts').doc(userId).get()

    if (!accountDoc.exists) {
      console.log(`❌ No connected Stripe account found for user: ${userId}`)
      return NextResponse.json({
        connected: false,
        fullySetup: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: 'not_connected'
      })
    }

    const accountData = accountDoc.data()
    console.log(`✅ Found connected Stripe account:`, {
      stripe_user_id: accountData?.stripe_user_id,
      charges_enabled: accountData?.charges_enabled,
      payouts_enabled: accountData?.payouts_enabled,
      details_submitted: accountData?.details_submitted,
      transfers_capability: accountData?.transfers_capability
    })

    const fullySetup = accountData?.charges_enabled && 
                      accountData?.payouts_enabled && 
                      accountData?.details_submitted &&
                      (accountData?.transfers_capability === 'active' || accountData?.charges_enabled)

    return NextResponse.json({
      connected: true,
      fullySetup,
      accountId: accountData?.stripe_user_id,
      chargesEnabled: accountData?.charges_enabled || false,
      payoutsEnabled: accountData?.payouts_enabled || false,
      detailsSubmitted: accountData?.details_submitted || false,
      transfersCapability: accountData?.transfers_capability,
      status: fullySetup ? 'active' : 'restricted',
      account: {
        stripe_user_id: accountData?.stripe_user_id,
        email: accountData?.email,
        country: accountData?.country,
        business_type: accountData?.business_type,
        livemode: accountData?.livemode,
        connectedAt: accountData?.createdAt,
        lastUpdated: accountData?.updatedAt,
        requirements: accountData?.requirements || {
          currently_due: [],
          past_due: [],
          pending_verification: []
        }
      }
    })

  } catch (error) {
    console.error('❌ Error checking Stripe connection status:', error)
    return NextResponse.json({ 
      error: 'Failed to check connection status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    let decodedToken
    
    try {
      decodedToken = await auth().verifyIdToken(idToken)
    } catch (authError) {
      console.error('❌ Token verification failed:', authError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decodedToken.uid
    const { refresh } = await request.json()

    console.log(`🔍 Checking Stripe connection status for user: ${userId}`)

    // Get the connected Stripe account from Firestore
    const accountDoc = await adminDb.collection('connectedStripeAccounts').doc(userId).get()

    if (!accountDoc.exists) {
      console.log(`❌ No connected Stripe account found for user: ${userId}`)
      return NextResponse.json({
        connected: false,
        fullySetup: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: 'not_connected'
      })
    }

    const accountData = accountDoc.data()
    console.log(`✅ Found connected Stripe account:`, {
      stripe_user_id: accountData?.stripe_user_id,
      charges_enabled: accountData?.charges_enabled,
      payouts_enabled: accountData?.payouts_enabled,
      details_submitted: accountData?.details_submitted,
      transfers_capability: accountData?.transfers_capability
    })

    // If refresh is requested, get fresh data from Stripe
    if (refresh && accountData?.stripe_user_id) {
      try {
        console.log(`🔄 Refreshing account data from Stripe for: ${accountData.stripe_user_id}`)
        
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
        const stripeAccount = await stripe.accounts.retrieve(accountData.stripe_user_id)
        
        // Update the account data in Firestore
        const updatedData = {
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          details_submitted: stripeAccount.details_submitted,
          country: stripeAccount.country,
          email: stripeAccount.email,
          business_type: stripeAccount.business_type,
          default_currency: stripeAccount.default_currency,
          requirements: {
            currently_due: stripeAccount.requirements?.currently_due || [],
            past_due: stripeAccount.requirements?.past_due || [],
            pending_verification: stripeAccount.requirements?.pending_verification || []
          },
          updatedAt: new Date().toISOString()
        }

        await adminDb.collection('connectedStripeAccounts').doc(userId).update(updatedData)
        
        // Merge the updated data
        Object.assign(accountData, updatedData)
        console.log(`✅ Refreshed account data from Stripe`)
        
      } catch (stripeError) {
        console.error('❌ Failed to refresh from Stripe:', stripeError)
        // Continue with existing data if Stripe refresh fails
      }
    }

    const fullySetup = accountData?.charges_enabled && 
                      accountData?.payouts_enabled && 
                      accountData?.details_submitted &&
                      (accountData?.transfers_capability === 'active' || accountData?.charges_enabled)

    return NextResponse.json({
      connected: true,
      fullySetup,
      accountId: accountData?.stripe_user_id,
      chargesEnabled: accountData?.charges_enabled || false,
      payoutsEnabled: accountData?.payouts_enabled || false,
      detailsSubmitted: accountData?.details_submitted || false,
      transfersCapability: accountData?.transfers_capability,
      status: fullySetup ? 'active' : 'restricted',
      account: {
        stripe_user_id: accountData?.stripe_user_id,
        email: accountData?.email,
        country: accountData?.country,
        business_type: accountData?.business_type,
        livemode: accountData?.livemode,
        connectedAt: accountData?.createdAt,
        lastUpdated: accountData?.updatedAt,
        requirements: accountData?.requirements || {
          currently_due: [],
          past_due: [],
          pending_verification: []
        }
      }
    })

  } catch (error) {
    console.error('❌ Error checking Stripe connection status:', error)
    return NextResponse.json({ 
      error: 'Failed to check connection status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
