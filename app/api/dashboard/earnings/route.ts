import { type NextRequest, NextResponse } from "next/server"

// Debug function to safely test imports
function debugImports() {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    imports: {},
    errors: [],
  }

  try {
    debugInfo.imports.nextAuth = "attempting import..."
    const { getServerSession } = require("next-auth")
    debugInfo.imports.nextAuth = "✅ success"
  } catch (error) {
    debugInfo.imports.nextAuth = `❌ ${error instanceof Error ? error.message : 'unknown error'}`
    debugInfo.errors.push(`NextAuth import failed: ${error}`)
  }

  try {
    debugInfo.imports.authOptions = "attempting import..."
    const { authOptions } = require("@/auth")
    debugInfo.imports.authOptions = "✅ success"
  } catch (error) {
    debugInfo.imports.authOptions = `❌ ${error instanceof Error ? error.message : 'unknown error'}`
    debugInfo.errors.push(`Auth options import failed: ${error}`)
  }

  try {
    debugInfo.imports.firebaseAdmin = "attempting import..."
    const { db } = require("@/lib/firebase-admin")
    debugInfo.imports.firebaseAdmin = "✅ success"
  } catch (error) {
    debugInfo.imports.firebaseAdmin = `❌ ${error instanceof Error ? error.message : 'unknown error'}`
    debugInfo.errors.push(`Firebase admin import failed: ${error}`)
  }

  try {
    debugInfo.imports.stripeService = "attempting import..."
    const { StripeEarningsService } = require("@/lib/stripe-earnings-service")
    debugInfo.imports.stripeService = "✅ success"
  } catch (error) {
    debugInfo.imports.stripeService = `❌ ${error instanceof Error ? error.message : 'unknown error'}`
    debugInfo.errors.push(`Stripe service import failed: ${error}`)
  }

  try {
    debugInfo.imports.formatUtils = "attempting import..."
    const { createDefaultEarningsData } = require("@/lib/format-utils")
    debugInfo.imports.formatUtils = "✅ success"
  } catch (error) {
    debugInfo.imports.formatUtils = `❌ ${error instanceof Error ? error.message : 'unknown error'}`
    debugInfo.errors.push(`Format utils import failed: ${error}`)
  }

  return debugInfo
}

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

export async function GET(request: NextRequest) {
  const debugLog: any[] = []
  
  try {
    debugLog.push({ step: "1", action: "Starting GET request", timestamp: new Date().toISOString() })

    // Test all imports first
    debugLog.push({ step: "2", action: "Testing imports", timestamp: new Date().toISOString() })
    const importDebug = debugImports()
    debugLog.push({ step: "2.1", action: "Import results", data: importDebug })

    if (importDebug.errors.length > 0) {
      debugLog.push({ step: "2.2", action: "Import errors detected", errors: importDebug.errors })
      return NextResponse.json({
        error: "Import errors detected",
        debug: {
          logs: debugLog,
          importErrors: importDebug.errors,
          importStatus: importDebug.imports,
        },
        ...createZeroEarningsData(),
        lastUpdated: new Date().toISOString(),
      }, { status: 500 })
    }

    debugLog.push({ step: "3", action: "All imports successful, proceeding with auth", timestamp: new Date().toISOString() })

    // Now try to use the imports
    let session = null
    try {
      debugLog.push({ step: "4", action: "Attempting to get server session", timestamp: new Date().toISOString() })
      const { getServerSession } = require("next-auth")
      const { authOptions } = require("@/auth")
      session = await getServerSession(authOptions)
      debugLog.push({ step: "4.1", action: "Session retrieved", hasSession: !!session, userId: session?.user?.id })
    } catch (authError) {
      debugLog.push({ step: "4.2", action: "Auth error", error: authError instanceof Error ? authError.message : 'unknown auth error' })
      return NextResponse.json({
        error: "Authentication error",
        debug: {
          logs: debugLog,
          authError: authError instanceof Error ? authError.message : 'unknown auth error',
        },
        ...createZeroEarningsData(),
        lastUpdated: new Date().toISOString(),
      })
    }

    if (!session?.user?.id) {
      debugLog.push({ step: "5", action: "No valid session found", timestamp: new Date().toISOString() })
      return NextResponse.json({ 
        error: "Unauthorized",
        debug: { logs: debugLog }
      }, { status: 401 })
    }

    const userId = session.user.id
    debugLog.push({ step: "6", action: "Valid session found", userId, timestamp: new Date().toISOString() })

    // Try Firebase to get user's Stripe connection status
    let userData = null
    let stripeAccountId = null
    try {
      debugLog.push({ step: "7", action: "Attempting Firebase connection", timestamp: new Date().toISOString() })
      const { db } = require("@/lib/firebase-admin")
      const userDoc = await db.collection("users").doc(userId).get()
      userData = userDoc.data()
      stripeAccountId = userData?.stripeAccountId
      debugLog.push({ 
        step: "7.1", 
        action: "Firebase query successful", 
        userExists: userDoc.exists,
        hasStripeAccount: !!stripeAccountId,
        stripeAccountId: stripeAccountId ? `${stripeAccountId.slice(0, 8)}...` : null,
        timestamp: new Date().toISOString()
      })
    } catch (firebaseError) {
      debugLog.push({ 
        step: "7.2", 
        action: "Firebase error", 
        error: firebaseError instanceof Error ? firebaseError.message : 'unknown firebase error',
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({
        error: "Database connection error",
        debug: {
          logs: debugLog,
          firebaseError: firebaseError instanceof Error ? firebaseError.message : 'unknown firebase error',
        },
        ...createZeroEarningsData(),
        lastUpdated: new Date().toISOString(),
      }, { status: 500 })
    }

    // Check if user has a connected Stripe account
    if (!stripeAccountId) {
      debugLog.push({ step: "8", action: "No Stripe account connected - returning zero data", timestamp: new Date().toISOString() })
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
    debugLog.push({ step: "9", action: "Checking Stripe account status", stripeAccountId: `${stripeAccountId.slice(0, 8)}...`, timestamp: new Date().toISOString() })
    
    // Check if account is charges_enabled and details_submitted
    const stripeChargesEnabled = userData?.stripeChargesEnabled || false
    const stripeDetailsSubmitted = userData?.stripeDetailsSubmitted || false
    const stripePayoutsEnabled = userData?.stripePayoutsEnabled || false

    if (!stripeChargesEnabled || !stripeDetailsSubmitted) {
      debugLog.push({ 
        step: "9.1", 
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
          requirementsCount: 0,
          currentlyDue: [],
          pastDue: [],
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

    // Only now try to fetch real Stripe data
    debugLog.push({ step: "10", action: "Fetching real Stripe earnings data", timestamp: new Date().toISOString() })
    
    try {
      const { StripeEarningsService } = require("@/lib/stripe-earnings-service")
      const earningsData = await StripeEarningsService.getEarningsData(stripeAccountId)
      
      if (!earningsData) {
        debugLog.push({ step: "10.1", action: "No earnings data returned from Stripe - returning zero data", timestamp: new Date().toISOString() })
        return NextResponse.json({
          ...createZeroEarningsData(),
          stripeAccountId,
          accountStatus: {
            chargesEnabled: stripeChargesEnabled,
            payoutsEnabled: stripePayoutsEnabled,
            detailsSubmitted: stripeDetailsSubmitted,
            requirementsCount: 0,
            currentlyDue: [],
            pastDue: [],
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

      debugLog.push({ step: "10.2", action: "Successfully retrieved Stripe earnings data", timestamp: new Date().toISOString() })

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
        step: "10.3", 
        action: "Error fetching Stripe data - returning zero data", 
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
          requirementsCount: 0,
          currentlyDue: [],
          pastDue: [],
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

export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: "POST method not implemented in debug mode",
    debug: {
      method: "POST",
      timestamp: new Date().toISOString(),
    },
  })
}
