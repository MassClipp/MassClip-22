import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 })
    }

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      userId,
      checks: []
    }

    // Check if Firestore is available
    debugInfo.checks.push({
      name: 'Firestore availability',
      status: !!db ? 'PASS' : 'FAIL',
      details: !!db ? 'Firestore instance available' : 'Firestore instance not available'
    })

    if (!db) {
      return NextResponse.json({ 
        error: 'Firestore not available',
        debug: debugInfo
      }, { status: 500 })
    }

    // Check connectedStripeAccounts collection
    try {
      const accountRef = doc(db, 'connectedStripeAccounts', userId)
      const accountSnap = await getDoc(accountRef)
      
      debugInfo.checks.push({
        name: 'Connected account document',
        status: accountSnap.exists() ? 'PASS' : 'FAIL',
        details: accountSnap.exists() ? 'Document exists' : 'Document does not exist'
      })

      if (accountSnap.exists()) {
        const accountData = accountSnap.data()
        debugInfo.connectedAccount = {
          exists: true,
          stripe_user_id: accountData?.stripe_user_id,
          connected: accountData?.connected,
          charges_enabled: accountData?.charges_enabled,
          payouts_enabled: accountData?.payouts_enabled,
          details_submitted: accountData?.details_submitted,
          connectedAt: accountData?.connectedAt,
          lastUpdated: accountData?.lastUpdated
        }
      } else {
        debugInfo.connectedAccount = { exists: false }
      }
    } catch (error) {
      debugInfo.checks.push({
        name: 'Connected account document',
        status: 'ERROR',
        details: `Error reading document: ${error}`
      })
    }

    // Check users collection
    try {
      const userRef = doc(db, 'users', userId)
      const userSnap = await getDoc(userRef)
      
      debugInfo.checks.push({
        name: 'User document',
        status: userSnap.exists() ? 'PASS' : 'FAIL',
        details: userSnap.exists() ? 'Document exists' : 'Document does not exist'
      })

      if (userSnap.exists()) {
        const userData = userSnap.data()
        debugInfo.userDocument = {
          exists: true,
          stripeConnected: userData?.stripeConnected,
          connectedAccountId: userData?.connectedAccountId,
          stripeConnectionUpdatedAt: userData?.stripeConnectionUpdatedAt
        }
      } else {
        debugInfo.userDocument = { exists: false }
      }
    } catch (error) {
      debugInfo.checks.push({
        name: 'User document',
        status: 'ERROR',
        details: `Error reading document: ${error}`
      })
    }

    // Environment check
    debugInfo.environment = {
      hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasStripeClientId: !!process.env.STRIPE_CLIENT_ID,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL
    }

    return NextResponse.json(debugInfo)

  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug check failed',
      message: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
