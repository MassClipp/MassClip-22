import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
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
    console.log('=== Debug Stripe Connection Test ===')
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'No authorization token provided',
        debug: { step: 'auth_header_check' }
      }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]

    // Verify the Firebase token
    const auth = getAuth()
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid token',
        debug: { step: 'token_verification', error: error instanceof Error ? error.message : 'Unknown' }
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

    // Check specific document
    const accountRef = doc(db, 'connectedStripeAccounts', userId)
    const accountDoc = await getDoc(accountRef)
    
    // Also check if there are any documents in the collection
    const collectionRef = collection(db, 'connectedStripeAccounts')
    const allDocs = await getDocs(collectionRef)
    
    // Check for documents with this user ID in different formats
    const userIdQuery = query(collectionRef, where('userId', '==', userId))
    const userIdDocs = await getDocs(userIdQuery)

    const debugInfo = {
      userId,
      targetDocument: {
        path: `connectedStripeAccounts/${userId}`,
        exists: accountDoc.exists(),
        data: accountDoc.exists() ? accountDoc.data() : null
      },
      collection: {
        totalDocuments: allDocs.size,
        allDocumentIds: allDocs.docs.map(doc => doc.id),
        allDocuments: allDocs.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }))
      },
      userIdQuery: {
        matchingDocuments: userIdDocs.size,
        documents: userIdDocs.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }))
      },
      environment: {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        hasFirebaseConfig: !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID)
      }
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo
    })

  } catch (error) {
    console.error('Debug test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: { step: 'general_error' }
    }, { status: 500 })
  }
}
