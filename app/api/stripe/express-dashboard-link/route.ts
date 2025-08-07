import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/firebase-admin'
import { db } from '@/lib/firebase-admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log('🔗 Creating Stripe Express dashboard link for user:', userId)

    // Get user's Stripe account ID from Firestore
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      console.log('❌ No Stripe account ID found for user')
      return NextResponse.json({ error: 'No Stripe account connected' }, { status: 404 })
    }

    const stripeAccountId = userData.stripeAccountId
    console.log('🔍 Found Stripe account ID:', stripeAccountId)

    // Create Express dashboard link
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId)
    
    console.log('✅ Created Express dashboard link successfully')

    return NextResponse.json({
      url: loginLink.url,
      accountId: stripeAccountId
    })

  } catch (error) {
    console.error('❌ Error creating Stripe Express dashboard link:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ 
        error: 'Stripe error: ' + error.message 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Failed to create dashboard link' 
    }, { status: 500 })
  }
}
