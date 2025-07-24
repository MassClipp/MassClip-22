import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb, getAuthenticatedUser } from '@/lib/firebase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const headers = request.headers
    const user = await getAuthenticatedUser(headers)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has a Stripe account
    const userDoc = await adminDb.collection('users').doc(user.uid).get()
    const userData = userDoc.data()

    let stripeAccountId = userData?.stripeAccountId

    // Create Stripe Express account if it doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })

      stripeAccountId = account.id

      // Save Stripe account ID to user document
      await adminDb.collection('users').doc(user.uid).update({
        stripeAccountId,
        stripeAccountCreated: new Date().toISOString(),
      })
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?connected=true`,
      type: 'account_onboarding',
    })

    return NextResponse.json({
      success: true,
      connectUrl: accountLink.url,
      accountId: stripeAccountId,
    })
  } catch (error) {
    console.error('Stripe connect URL error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create Stripe connection URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
