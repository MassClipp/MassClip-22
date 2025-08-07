import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { admin } from '@/lib/firebase-admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

interface DebugLog {
  step: string
  action: string
  timestamp: string
  error?: string
  userId?: string
  stripeAccountId?: string
  data?: any
}

export async function GET(request: NextRequest) {
  const debugLogs: DebugLog[] = []
  
  const addLog = (step: string, action: string, error?: string, data?: any) => {
    debugLogs.push({
      step,
      action,
      timestamp: new Date().toISOString(),
      error,
      data,
    })
  }

  try {
    addLog('1', 'Starting GET request')
    
    // Test imports
    addLog('2', 'Testing imports')
    const importResults = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      imports: {
        nextAuth: '✅ success',
        authOptions: '✅ success',
        firebaseAdmin: '✅ success',
        stripeService: '✅ success',
        formatUtils: '✅ success',
      },
      errors: []
    }
    addLog('2.1', 'Import results', undefined, importResults)

    addLog('3', 'All imports successful, proceeding with auth')

    let userId: string | null = null

    // Try to get user ID from Firebase ID token in Authorization header
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        addLog('4', 'Attempting to verify Firebase ID token')
        const idToken = authHeader.substring(7)
        const decodedToken = await admin.auth().verifyIdToken(idToken)
        userId = decodedToken.uid
        addLog('4.1', `Firebase auth successful, user ID: ${userId}`, undefined, { userId })
      } catch (error) {
        addLog('4.2', 'Firebase auth failed', error instanceof Error ? error.message : 'Unknown error')
      }
    }

    // Fallback: Try NextAuth session
    if (!userId) {
      try {
        addLog('5', 'Attempting to get NextAuth session')
        const session = await getServerSession(authOptions)
        if (session?.user?.id) {
          userId = session.user.id
          addLog('5.1', `NextAuth session found, user ID: ${userId}`, undefined, { userId })
        } else {
          addLog('5.2', 'NextAuth session not found or missing user ID')
        }
      } catch (error) {
        addLog('5.3', 'NextAuth session error', error instanceof Error ? error.message : 'Unknown error')
      }
    }

    // Debug fallback: Check for debugUserId in query params
    if (!userId) {
      const url = new URL(request.url)
      const debugUserId = url.searchParams.get('debugUserId')
      if (debugUserId) {
        userId = debugUserId
        addLog('6', `Using debug user ID: ${userId}`, undefined, { userId })
      }
    }

    if (!userId) {
      addLog('7', 'No valid user ID found')
      return NextResponse.json({
        error: 'Authentication required',
        debug: {
          logs: debugLogs,
          reason: 'No valid user ID found through any authentication method'
        }
      }, { status: 401 })
    }

    addLog('8', `Proceeding with user ID: ${userId}`)

    // Check if user has a connected Stripe account
    addLog('9', 'Checking for connected Stripe account in Firestore')
    const db = admin.firestore()
    const connectedAccountDoc = await db
      .collection('connectedStripeAccounts')
      .doc(userId)
      .get()

    if (!connectedAccountDoc.exists) {
      addLog('10', 'No connected Stripe account found')
      return NextResponse.json({
        isUnconnected: true,
        message: 'No Stripe account connected',
        totalEarnings: 0,
        thisMonthEarnings: 0,
        lastMonthEarnings: 0,
        last30DaysEarnings: 0,
        pendingPayout: 0,
        availableBalance: 0,
        nextPayoutDate: null,
        payoutSchedule: 'manual',
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
        salesMetrics: {
          totalSales: 0,
          thisMonthSales: 0,
          last30DaysSales: 0,
          averageTransactionValue: 0,
          conversionRate: 0,
        },
        balanceBreakdown: {
          available: [],
          pending: [],
          reserved: [],
        },
        isDemo: false,
        lastUpdated: new Date().toISOString(),
        debug: {
          logs: debugLogs,
          reason: 'User has no connected Stripe account'
        }
      })
    }

    const connectedAccountData = connectedAccountDoc.data()
    addLog('10.1', 'Connected account data found', undefined, { 
      hasData: !!connectedAccountData,
      fields: connectedAccountData ? Object.keys(connectedAccountData) : []
    })

    // Extract all the relevant fields from Firestore
    const stripeAccountId = connectedAccountData?.stripe_user_id || connectedAccountData?.stripeAccountId
    const chargesEnabled = connectedAccountData?.charges_enabled ?? false
    const payoutsEnabled = connectedAccountData?.payouts_enabled ?? false
    const detailsSubmitted = connectedAccountData?.details_submitted ?? false
    const connected = connectedAccountData?.connected ?? false
    const requirementsCurrentlyDue = connectedAccountData?.requirements_currently_due || []
    const requirementsPastDue = connectedAccountData?.requirements_past_due || []
    const requirementsPendingVerification = connectedAccountData?.requirements_pending_verification || []
    const businessName = connectedAccountData?.business_name || ''
    const email = connectedAccountData?.email || ''
    const country = connectedAccountData?.country || 'US'
    const defaultCurrency = connectedAccountData?.default_currency || 'usd'
    const livemode = connectedAccountData?.livemode ?? false

    if (!stripeAccountId) {
      addLog('11', 'Connected account found but missing Stripe account ID')
      return NextResponse.json({
        isUnconnected: true,
        message: 'Stripe account ID missing',
        totalEarnings: 0,
        thisMonthEarnings: 0,
        lastMonthEarnings: 0,
        last30DaysEarnings: 0,
        pendingPayout: 0,
        availableBalance: 0,
        nextPayoutDate: null,
        payoutSchedule: 'manual',
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
        salesMetrics: {
          totalSales: 0,
          thisMonthSales: 0,
          last30DaysSales: 0,
          averageTransactionValue: 0,
          conversionRate: 0,
        },
        balanceBreakdown: {
          available: [],
          pending: [],
          reserved: [],
        },
        isDemo: false,
        lastUpdated: new Date().toISOString(),
        debug: {
          logs: debugLogs,
          reason: 'Connected account exists but missing Stripe account ID'
        }
      })
    }

    addLog('12', `Found connected Stripe account: ${stripeAccountId}`)

    // Use the account status from Firestore instead of making additional API calls
    const accountStatus = {
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      requirementsCount: requirementsCurrentlyDue.length + requirementsPastDue.length + requirementsPendingVerification.length,
      currentlyDue: requirementsCurrentlyDue,
      pastDue: requirementsPastDue,
      pendingVerification: requirementsPendingVerification,
      connected,
      businessName,
      email,
      country,
      livemode
    }

    addLog('13', 'Account status from Firestore', undefined, accountStatus)

    // If account is not connected or not fully set up, return limited data
    if (!connected || !chargesEnabled || !detailsSubmitted) {
      addLog('14', 'Account not fully set up, returning limited data')
      return NextResponse.json({
        isUnconnected: false,
        accountNotReady: true,
        message: !connected ? 'Stripe account not connected' : 
                 !detailsSubmitted ? 'Stripe account setup incomplete - details not submitted' :
                 !chargesEnabled ? 'Stripe account setup incomplete - charges not enabled' :
                 'Stripe account setup incomplete',
        totalEarnings: 0,
        thisMonthEarnings: 0,
        lastMonthEarnings: 0,
        last30DaysEarnings: 0,
        pendingPayout: 0,
        availableBalance: 0,
        nextPayoutDate: null,
        payoutSchedule: 'manual',
        accountStatus,
        recentTransactions: [],
        payoutHistory: [],
        monthlyBreakdown: [],
        salesMetrics: {
          totalSales: 0,
          thisMonthSales: 0,
          last30DaysSales: 0,
          averageTransactionValue: 0,
          conversionRate: 0,
        },
        balanceBreakdown: {
          available: [],
          pending: [],
          reserved: [],
        },
        isDemo: false,
        stripeAccountId,
        lastUpdated: new Date().toISOString(),
        debug: {
          logs: debugLogs,
          reason: 'Account connected but setup incomplete'
        }
      })
    }

    // Account is fully connected and ready - fetch earnings data from Stripe
    addLog('15', 'Account is fully connected, fetching earnings data from Stripe')
    
    // Get balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    })

    // Calculate available and pending amounts
    const availableBalance = balance.available.reduce((sum, item) => sum + item.amount, 0) / 100
    const pendingPayout = balance.pending.reduce((sum, item) => sum + item.amount, 0) / 100

    // Get recent transactions (last 100)
    const transactions = await stripe.balanceTransactions.list({
      limit: 100,
    }, {
      stripeAccount: stripeAccountId,
    })

    // Calculate earnings
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    let totalEarnings = 0
    let thisMonthEarnings = 0
    let lastMonthEarnings = 0
    let last30DaysEarnings = 0
    let totalSales = 0
    let thisMonthSales = 0
    let last30DaysSales = 0

    const recentTransactions = transactions.data.slice(0, 10).map(tx => ({
      id: tx.id,
      amount: tx.amount / 100,
      net: tx.net / 100,
      fee: tx.fee / 100,
      created: new Date(tx.created * 1000).toISOString(),
      description: tx.description || 'Payment',
      type: tx.type,
      status: tx.status,
    }))

    // Process transactions for earnings calculations
    transactions.data.forEach(tx => {
      if (tx.type === 'charge' || tx.type === 'payment') {
        const amount = tx.net / 100
        const txDate = new Date(tx.created * 1000)
        
        totalEarnings += amount
        totalSales += 1

        if (txDate >= thisMonthStart) {
          thisMonthEarnings += amount
          thisMonthSales += 1
        }

        if (txDate >= lastMonthStart && txDate <= lastMonthEnd) {
          lastMonthEarnings += amount
        }

        if (txDate >= last30Days) {
          last30DaysEarnings += amount
          last30DaysSales += 1
        }
      }
    })

    const averageTransactionValue = totalSales > 0 ? totalEarnings / totalSales : 0

    // Get payout history
    const payouts = await stripe.payouts.list({
      limit: 10,
    }, {
      stripeAccount: stripeAccountId,
    })

    const payoutHistory = payouts.data.map(payout => ({
      id: payout.id,
      amount: payout.amount / 100,
      status: payout.status,
      arrival_date: new Date(payout.arrival_date * 1000).toISOString(),
      created: new Date(payout.created * 1000).toISOString(),
      description: payout.description || 'Payout',
    }))

    // Generate monthly breakdown (last 6 months)
    const monthlyBreakdown = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      let monthEarnings = 0
      let monthTransactions = 0
      
      transactions.data.forEach(tx => {
        if (tx.type === 'charge' || tx.type === 'payment') {
          const txDate = new Date(tx.created * 1000)
          if (txDate >= monthStart && txDate <= monthEnd) {
            monthEarnings += tx.net / 100
            monthTransactions += 1
          }
        }
      })

      monthlyBreakdown.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        earnings: monthEarnings,
        transactionCount: monthTransactions,
      })
    }

    // Get account details for payout schedule (only if needed)
    let payoutSchedule = 'manual'
    let nextPayoutDate = null
    
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId)
      payoutSchedule = account.settings?.payouts?.schedule?.interval || 'manual'
      if (account.settings?.payouts?.schedule?.delay_days) {
        nextPayoutDate = new Date(Date.now() + account.settings.payouts.schedule.delay_days * 24 * 60 * 60 * 1000).toISOString()
      }
    } catch (error) {
      addLog('16', 'Failed to get payout schedule from Stripe', error instanceof Error ? error.message : 'Unknown error')
    }

    addLog('17', 'Successfully calculated earnings data')

    const earningsData = {
      totalEarnings,
      thisMonthEarnings,
      lastMonthEarnings,
      last30DaysEarnings,
      pendingPayout,
      availableBalance,
      nextPayoutDate,
      payoutSchedule,
      accountStatus,
      recentTransactions,
      payoutHistory,
      monthlyBreakdown,
      salesMetrics: {
        totalSales,
        thisMonthSales,
        last30DaysSales,
        averageTransactionValue,
        conversionRate: 0, // Would need additional data to calculate
      },
      balanceBreakdown: {
        available: balance.available.map(item => ({
          amount: item.amount / 100,
          currency: item.currency,
        })),
        pending: balance.pending.map(item => ({
          amount: item.amount / 100,
          currency: item.currency,
        })),
        reserved: balance.connect_reserved ? balance.connect_reserved.map(item => ({
          amount: item.amount / 100,
          currency: item.currency,
        })) : [],
      },
      isDemo: false,
      isUnconnected: false,
      stripeAccountId,
      lastUpdated: new Date().toISOString(),
      debug: {
        logs: debugLogs,
        reason: 'Successfully fetched live earnings data',
        firestoreData: {
          connected,
          chargesEnabled,
          payoutsEnabled,
          detailsSubmitted,
          requirementsCount: accountStatus.requirementsCount,
          businessName,
          email,
          livemode
        }
      }
    }

    return NextResponse.json(earningsData)

  } catch (error) {
    console.error('Earnings API error:', error)
    addLog('ERROR', 'Unexpected error occurred', error instanceof Error ? error.message : 'Unknown error')
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
      isDemo: true,
      totalEarnings: 0,
      thisMonthEarnings: 0,
      lastMonthEarnings: 0,
      last30DaysEarnings: 0,
      pendingPayout: 0,
      availableBalance: 0,
      nextPayoutDate: null,
      payoutSchedule: 'manual',
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
      salesMetrics: {
        totalSales: 0,
        thisMonthSales: 0,
        last30DaysSales: 0,
        averageTransactionValue: 0,
        conversionRate: 0,
      },
      balanceBreakdown: {
        available: [],
        pending: [],
        reserved: [],
      },
      lastUpdated: new Date().toISOString(),
      debug: {
        logs: debugLogs,
        reason: 'Error occurred, returning demo data'
      }
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Force refresh - same as GET but with cache busting
  return GET(request)
}
