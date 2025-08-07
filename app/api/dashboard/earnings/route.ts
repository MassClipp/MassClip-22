import { type NextRequest, NextResponse } from "next/server"
import { adminDb, auth } from "@/lib/firebase-admin"

// Create zero earnings data for unconnected accounts
function createZeroEarningsData() {
  return {
    totalEarnings: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    last30DaysEarnings: 0,
    pendingPayout: 0,
    availableBalance: 0,
    nextPayoutDate: null,
    payoutSchedule: "monthly",
    salesMetrics: {
      totalSales: 0,
      thisMonthSales: 0,
      last30DaysSales: 0,
      averageTransactionValue: 0,
      conversionRate: 0,
    },
    accountStatus: {
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requirementsCount: 0,
      currentlyDue: [],
      pastDue: [],
    },
    recentTransactions: [],
    payoutHistory: [],
    monthlyBreakdown: [],
    balanceBreakdown: {
      available: [],
      pending: [],
      reserved: [],
    },
    isDemo: false,
    isUnconnected: true,
    message: "Connect your Stripe account to view earnings data",
  }
}

// Get user ID from Firebase ID token
async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header found')
      return null
    }

    const idToken = authHeader.substring(7)
    if (!idToken) {
      console.log('❌ No ID token found in authorization header')
      return null
    }

    console.log('🔍 Verifying Firebase ID token...')
    const decodedToken = await auth.verifyIdToken(idToken)
    console.log('✅ Token verified for user:', decodedToken.uid)
    return decodedToken.uid
  } catch (error) {
    console.error('❌ Error verifying ID token:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  const debugLog: any[] = []
  
  try {
    debugLog.push({ step: "1", action: "Starting earnings API request", timestamp: new Date().toISOString() })

    // Get user ID from Firebase ID token
    const userId = await getUserIdFromToken(request)
    
    if (!userId) {
      debugLog.push({ step: "2", action: "No valid user ID found from token", timestamp: new Date().toISOString() })
      return NextResponse.json({ 
        error: "Unauthorized - no valid Firebase ID token",
        debug: { logs: debugLog },
        ...createZeroEarningsData(),
        lastUpdated: new Date().toISOString(),
      }, { status: 401 })
    }

    debugLog.push({ step: "3", action: "Valid user ID found", userId, timestamp: new Date().toISOString() })

    // Look up user's Stripe connection in connectedStripeAccounts collection
    let connectedAccountData = null
    let stripeAccountId = null
    
    try {
      debugLog.push({ step: "4", action: "Querying connectedStripeAccounts collection", timestamp: new Date().toISOString() })
      
      const accountRef = adminDb.collection("connectedStripeAccounts").doc(userId)
      const accountDoc = await accountRef.get()
      
      if (accountDoc.exists) {
        connectedAccountData = accountDoc.data()
        stripeAccountId = connectedAccountData?.stripe_user_id
        debugLog.push({ 
          step: "4.1", 
          action: "Connected account data found", 
          hasStripeAccount: !!stripeAccountId,
          connected: connectedAccountData?.connected,
          chargesEnabled: connectedAccountData?.charges_enabled,
          detailsSubmitted: connectedAccountData?.details_submitted,
          stripeAccountId: stripeAccountId ? `${stripeAccountId.slice(0, 8)}...` : null,
          timestamp: new Date().toISOString()
        })
      } else {
        debugLog.push({ step: "4.1", action: "No connected account document found", timestamp: new Date().toISOString() })
      }
    } catch (firestoreError) {
      debugLog.push({ 
        step: "4.2", 
        action: "Firestore error getting connected account", 
        error: firestoreError instanceof Error ? firestoreError.message : 'unknown firestore error',
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({
        error: "Database connection error",
        debug: {
          logs: debugLog,
          firestoreError: firestoreError instanceof Error ? firestoreError.message : 'unknown firestore error',
        },
        ...createZeroEarningsData(),
        lastUpdated: new Date().toISOString(),
      }, { status: 500 })
    }

    // Check if user has a connected Stripe account
    if (!stripeAccountId || !connectedAccountData?.connected) {
      debugLog.push({ step: "5", action: "No Stripe account connected - returning zero data", timestamp: new Date().toISOString() })
      return NextResponse.json({
        ...createZeroEarningsData(),
        stripeAccountId: null,
        lastUpdated: new Date().toISOString(),
        debug: {
          logs: debugLog,
          success: true,
          reason: "No Stripe account connected",
          totalSteps: debugLog.length,
        },
      })
    }

    // Verify Stripe account is properly set up
    debugLog.push({ step: "6", action: "Checking Stripe account status", stripeAccountId: `${stripeAccountId.slice(0, 8)}...`, timestamp: new Date().toISOString() })
    
    const stripeChargesEnabled = connectedAccountData?.charges_enabled || false
    const stripeDetailsSubmitted = connectedAccountData?.details_submitted || false
    const stripePayoutsEnabled = connectedAccountData?.payouts_enabled || false

    if (!stripeChargesEnabled || !stripeDetailsSubmitted) {
      debugLog.push({ 
        step: "6.1", 
        action: "Stripe account not fully set up - returning zero data", 
        chargesEnabled: stripeChargesEnabled,
        detailsSubmitted: stripeDetailsSubmitted,
        payoutsEnabled: stripePayoutsEnabled,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({
        ...createZeroEarningsData(),
        stripeAccountId,
        accountStatus: {
          chargesEnabled: stripeChargesEnabled,
          payoutsEnabled: stripePayoutsEnabled,
          detailsSubmitted: stripeDetailsSubmitted,
          requirementsCount: connectedAccountData?.requirements_currently_due?.length || 0,
          currentlyDue: connectedAccountData?.requirements_currently_due || [],
          pastDue: connectedAccountData?.requirements_past_due || [],
        },
        lastUpdated: new Date().toISOString(),
        debug: {
          logs: debugLog,
          success: true,
          reason: "Stripe account not fully set up",
          totalSteps: debugLog.length,
        },
      })
    }

    // Account is fully set up, try to fetch real Stripe data
    debugLog.push({ step: "7", action: "Fetching real Stripe earnings data", timestamp: new Date().toISOString() })
    
    try {
      const { StripeEarningsService } = require("@/lib/stripe-earnings-service")
      const earningsData = await StripeEarningsService.getEarningsData(stripeAccountId)
      
      if (!earningsData) {
        debugLog.push({ step: "7.1", action: "No earnings data returned from Stripe - returning zero data with account status", timestamp: new Date().toISOString() })
        return NextResponse.json({
          ...createZeroEarningsData(),
          stripeAccountId,
          accountStatus: {
            chargesEnabled: stripeChargesEnabled,
            payoutsEnabled: stripePayoutsEnabled,
            detailsSubmitted: stripeDetailsSubmitted,
            requirementsCount: connectedAccountData?.requirements_currently_due?.length || 0,
            currentlyDue: connectedAccountData?.requirements_currently_due || [],
            pastDue: connectedAccountData?.requirements_past_due || [],
          },
          lastUpdated: new Date().toISOString(),
          debug: {
            logs: debugLog,
            success: true,
            reason: "No earnings data from Stripe",
            totalSteps: debugLog.length,
          },
        })
      }

      debugLog.push({ step: "7.2", action: "Successfully retrieved Stripe earnings data", timestamp: new Date().toISOString() })

      // Return real Stripe data
      return NextResponse.json({
        ...earningsData,
        stripeAccountId,
        isDemo: false,
        isUnconnected: false,
        lastUpdated: new Date().toISOString(),
        debug: {
          logs: debugLog,
          success: true,
          reason: "Real Stripe data",
          totalSteps: debugLog.length,
        },
      })

    } catch (stripeError) {
      debugLog.push({ 
        step: "7.3", 
        action: "Error fetching Stripe data - returning zero data with account status", 
        error: stripeError instanceof Error ? stripeError.message : 'unknown stripe error',
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.json({
        ...createZeroEarningsData(),
        stripeAccountId,
        error: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error',
        accountStatus: {
          chargesEnabled: stripeChargesEnabled,
          payoutsEnabled: stripePayoutsEnabled,
          detailsSubmitted: stripeDetailsSubmitted,
          requirementsCount: connectedAccountData?.requirements_currently_due?.length || 0,
          currentlyDue: connectedAccountData?.requirements_currently_due || [],
          pastDue: connectedAccountData?.requirements_past_due || [],
        },
        lastUpdated: new Date().toISOString(),
        debug: {
          logs: debugLog,
          success: false,
          reason: "Stripe API error",
          stripeError: stripeError instanceof Error ? stripeError.message : 'unknown stripe error',
          totalSteps: debugLog.length,
        },
      })
    }

  } catch (error) {
    debugLog.push({ 
      step: "ERROR", 
      action: "Unexpected error caught", 
      error: error instanceof Error ? error.message : 'unknown error',
      stack: error instanceof Error ? error.stack : 'no stack trace',
      timestamp: new Date().toISOString()
    })

    console.error("[EarningsAPI] Unexpected error:", error)
    
    return NextResponse.json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
      debug: {
        logs: debugLog,
        errorDetails: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace available',
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          timestamp: new Date().toISOString(),
        },
      },
      ...createZeroEarningsData(),
      lastUpdated: new Date().toISOString(),
    }, { status: 500 })
  }
}
