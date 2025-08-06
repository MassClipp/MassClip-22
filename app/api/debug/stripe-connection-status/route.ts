import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  const debugLog: any[] = []
  
  try {
    debugLog.push({ step: 1, action: "Starting connection status check", timestamp: new Date().toISOString() })

    // Get userId from query params for debugging
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const refresh = searchParams.get('refresh') === 'true'

    debugLog.push({ step: 2, action: "Extracted parameters", data: { userId: !!userId, refresh }, timestamp: new Date().toISOString() })

    if (!userId) {
      return NextResponse.json({
        error: "User ID is required for debugging",
        debug: { logs: debugLog }
      }, { status: 400 })
    }

    // Test Firestore availability
    debugLog.push({ step: 3, action: "Testing Firestore availability", timestamp: new Date().toISOString() })
    
    const checks = []

    try {
      // Test basic Firestore connection
      const testDoc = adminDb.collection('_test').doc('connection')
      await testDoc.set({ test: true, timestamp: new Date() }, { merge: true })
      checks.push({
        name: "Firestore availability",
        status: "PASS",
        details: "Firestore instance available"
      })
      debugLog.push({ step: 3.1, action: "Firestore availability test passed", timestamp: new Date().toISOString() })
    } catch (firestoreError) {
      checks.push({
        name: "Firestore availability", 
        status: "ERROR",
        details: `Error: ${firestoreError}`
      })
      debugLog.push({ step: 3.1, action: "Firestore availability test failed", error: String(firestoreError), timestamp: new Date().toISOString() })
    }

    // Test connected account document
    try {
      debugLog.push({ step: 4, action: "Checking connected account document", userId, timestamp: new Date().toISOString() })
      
      const accountRef = adminDb.collection('connectedStripeAccounts').doc(userId)
      const accountDoc = await accountRef.get()
      
      if (accountDoc.exists) {
        const accountData = accountDoc.data()
        checks.push({
          name: "Connected account document",
          status: "PASS", 
          details: `Document exists with ${Object.keys(accountData || {}).length} fields`,
          data: {
            connected: accountData?.connected,
            charges_enabled: accountData?.charges_enabled,
            details_submitted: accountData?.details_submitted,
            stripe_user_id: accountData?.stripe_user_id,
            connectedAt: accountData?.connectedAt
          }
        })
        debugLog.push({ step: 4.1, action: "Connected account document found", data: accountData, timestamp: new Date().toISOString() })
      } else {
        checks.push({
          name: "Connected account document",
          status: "NOT_FOUND",
          details: "No connected account document found for this user"
        })
        debugLog.push({ step: 4.1, action: "Connected account document not found", timestamp: new Date().toISOString() })
      }
    } catch (accountError) {
      checks.push({
        name: "Connected account document",
        status: "ERROR", 
        details: `Error reading document: ${accountError}`
      })
      debugLog.push({ step: 4.1, action: "Error reading connected account document", error: String(accountError), timestamp: new Date().toISOString() })
    }

    // Test user document
    try {
      debugLog.push({ step: 5, action: "Checking user document", userId, timestamp: new Date().toISOString() })
      
      const userRef = adminDb.collection('users').doc(userId)
      const userDoc = await userRef.get()
      
      if (userDoc.exists) {
        const userData = userDoc.data()
        checks.push({
          name: "User document",
          status: "PASS",
          details: `User document exists with ${Object.keys(userData || {}).length} fields`,
          data: {
            stripeConnected: userData?.stripeConnected,
            connectedAccountId: userData?.connectedAccountId,
            stripeConnectionUpdatedAt: userData?.stripeConnectionUpdatedAt
          }
        })
        debugLog.push({ step: 5.1, action: "User document found", data: userData, timestamp: new Date().toISOString() })
      } else {
        checks.push({
          name: "User document",
          status: "NOT_FOUND",
          details: "No user document found"
        })
        debugLog.push({ step: 5.1, action: "User document not found", timestamp: new Date().toISOString() })
      }
    } catch (userError) {
      checks.push({
        name: "User document",
        status: "ERROR",
        details: `Error reading document: ${userError}`
      })
      debugLog.push({ step: 5.1, action: "Error reading user document", error: String(userError), timestamp: new Date().toISOString() })
    }

    // Environment check
    const environment = {
      hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasStripeClientId: !!process.env.STRIPE_CLIENT_ID,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL
    }

    debugLog.push({ step: 6, action: "Environment check completed", data: environment, timestamp: new Date().toISOString() })

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      userId,
      checks,
      environment,
      debug: {
        logs: debugLog,
        totalSteps: debugLog.length
      }
    })

  } catch (error) {
    debugLog.push({ step: "ERROR", action: "Unexpected error", error: String(error), timestamp: new Date().toISOString() })
    
    return NextResponse.json({
      error: "Debug check failed",
      message: String(error),
      debug: {
        logs: debugLog,
        errorDetails: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : { message: String(error) }
      }
    }, { status: 500 })
  }
}
