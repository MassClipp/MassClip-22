import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb, getAuthenticatedUser } from '@/lib/firebase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const headers = request.headers
    const user = await getAuthenticatedUser(headers)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Stripe account ID
    const userDoc = await adminDb.collection('users').doc(user.uid).get()
    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({
        connected: false,
        accountId: null,
        status: 'no_account',
      })
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId)

    const isConnected = account.details_submitted && 
                       account.charges_enabled && 
                       account.payouts_enabled

    return NextResponse.json({
      connected: isConnected,
      accountId: stripeAccountId,
      status: account.details_submitted ? 'complete' : 'incomplete',
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements,
    })
  } catch (error) {
    console.error('Stripe status check error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check Stripe status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
