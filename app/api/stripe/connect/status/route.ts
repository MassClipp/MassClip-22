import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { getAuth } from 'firebase-admin/auth'
import { initializeApp, getApps, cert } from 'firebase-admin/app'

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== Stripe Connect Status Check ===')
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid authorization header found')
      return NextResponse.json({ 
        connected: false, 
        error: 'No authorization token provided' 
      }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    console.log('Token received:', token ? 'Yes' : 'No')

    // Verify the Firebase token
    const auth = getAuth()
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
      console.log('Token verified for user:', decodedToken.uid)
    } catch (error) {
      console.error('Token verification failed:', error)
      return NextResponse.json({ 
        connected: false, 
        error: 'Invalid token' 
      }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Initialize Firestore
    const { initializeApp: initializeClientApp, getApps: getClientApps } = await import('firebase/app')
    const { getFirestore: getClientFirestore } = await import('firebase/firestore')
    
    let clientApp
    if (getClientApps().length === 0) {
      clientApp = initializeClientApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      })
    } else {
      clientApp = getClientApps()[0]
    }

    const db = getClientFirestore(clientApp)
    console.log('Firestore initialized')

    // Check for connected Stripe account
    const accountRef = doc(db, 'connectedStripeAccounts', userId)
    console.log('Checking document path:', `connectedStripeAccounts/${userId}`)
    
    const accountDoc = await getDoc(accountRef)
    console.log('Document exists:', accountDoc.exists())
    
    if (accountDoc.exists()) {
      const data = accountDoc.data()
      console.log('Document data:', JSON.stringify(data, null, 2))
      
      const isConnected = !!(data?.stripeAccountId && data?.accountStatus === 'active')
      console.log('Connection status:', isConnected)
      
      return NextResponse.json({
        connected: isConnected,
        accountId: data?.stripeAccountId || null,
        status: data?.accountStatus || 'unknown',
        lastUpdated: data?.lastUpdated || null,
        debug: {
          userId,
          documentExists: true,
          rawData: data
        }
      })
    } else {
      console.log('No connected account document found')
      return NextResponse.json({
        connected: false,
        accountId: null,
        status: 'not_connected',
        debug: {
          userId,
          documentExists: false,
          message: 'No connectedStripeAccounts document found'
        }
      })
    }

  } catch (error) {
    console.error('Error checking Stripe connection status:', error)
    return NextResponse.json({
      connected: false,
      error: 'Internal server error',
      debug: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}
