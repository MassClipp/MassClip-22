import { NextRequest, NextResponse } from 'next/server'
import { getConnectedAccount, refreshConnectedAccount } from '@/lib/stripe-connect-service'
import { adminAuth } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    
    // Verify the Firebase token
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get connected account
    let account = await getConnectedAccount(userId)
    
    if (!account) {
      return NextResponse.json({ error: 'No connected account found' }, { status: 404 })
    }

    // Refresh account data from Stripe
    account = await refreshConnectedAccount(userId)

    return NextResponse.json({
      success: true,
      account: {
        stripeUserId: account?.stripe_user_id,
        chargesEnabled: account?.charges_enabled,
        payoutsEnabled: account?.payouts_enabled,
        detailsSubmitted: account?.details_submitted,
        country: account?.country,
        email: account?.email,
        businessType: account?.business_type,
        defaultCurrency: account?.default_currency,
        businessProfile: account?.business_profile,
        requirements: account?.requirements,
        connected: true,
        connectedAt: account?.createdAt,
        lastUpdated: account?.updatedAt,
      }
    })

  } catch (error) {
    console.error('Error fetching account details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account details' },
      { status: 500 }
    )
  }
}
