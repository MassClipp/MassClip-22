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
    
    let userId: string | null = null

    // Try to get user ID from Firebase ID token in Authorization header
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        addLog('2', 'Attempting to verify Firebase ID token')
        const idToken = authHeader.substring(7)
        const decodedToken = await admin.auth().verifyIdToken(idToken)
        userId = decodedToken.uid
        addLog('2.1', `Firebase auth successful, user ID: ${userId}`)
      } catch (error) {
        addLog('2.2', 'Firebase auth failed', error instanceof Error ? error.message : 'Unknown error')
      }
    }

    // Fallback: Try NextAuth session
    if (!userId) {
      try {
        addLog('3', 'Attempting to get NextAuth session')
        const session = await getServerSession(authOptions)
        if (session?.user?.id) {
          userId = session.user.id
          addLog('3.1', `NextAuth session found, user ID: ${userId}`)
        } else {
          addLog('3.2', 'NextAuth session not found or missing user ID')
        }
      } catch (error) {
        addLog('3.3', 'NextAuth session error', error instanceof Error ? error.message : 'Unknown error')
      }
    }

    if (!userId) {
      addLog('4', 'No valid user ID found')
      return NextResponse.json({
        error: 'Authentication required',
        debug: {
          logs: debugLogs,
          reason: 'No valid user ID found through any authentication method'
        }
      }, { status: 401 })
    }

    addLog('5', `Proceeding with user ID: ${userId}`)

    // Check for connected Stripe account in the connectedStripeAccounts collection
    addLog('6', 'Checking for connected Stripe account in connectedStripeAccounts collection')
    const db = admin.firestore()
    const connectedAccountDoc = await db
      .collection('connectedStripeAccounts')
      .doc(userId)
      .get()

    let stripeAccountId: string | null = null
    let connectedAccountData: any = null

    if (connectedAccountDoc.exists) {
      connectedAccountData = connectedAccountDoc.data()
      stripeAccountId = connectedAccountData?.stripe_user_id
      addLog('7', `Found connected account with ID: ${stripeAccountId}`, undefined, {
        hasData: !!connectedAccountData,
        stripeUserId: connectedAccountData?.stripe_user_id,
        chargesEnabled: connectedAccountData?.charges_enabled,
        detailsSubmitted: connectedAccountData?.details_submitted
      })
    } else {
      addLog('8', 'No connected account found in connectedStripeAccounts')
      
      // Fallback: Check the users collection for legacy data
      addLog('9', 'Checking users collection for legacy Stripe account ID')
      const userDoc = await db.collection('users').doc(userId).get()
      if (userDoc.exists) {
        const userData = userDoc.data()
        stripeAccountId = userData?.stripeAccountId
        addLog('10', `Legacy check - found stripeAccountId: ${stripeAccountId}`, undefined, {
          stripeAccountId: userData?.stripeAccountId,
          stripeAccountStatus: userData?.stripeAccountStatus
        })
      }
    }

    if (!stripeAccountId) {
      addLog('11', 'No Stripe account ID found in any collection')
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
          reason: 'No Stripe account ID found'
        }
      })
    }

    addLog('12', `Using Stripe account ID: ${stripeAccountId}`)

    // Verify account exists and get current status from Stripe
    addLog('13', 'Fetching account details from Stripe')
    let account: Stripe.Account
    try {
      account = await stripe.accounts.retrieve(stripeAccountId)
      addLog('14', 'Successfully retrieved account from Stripe', undefined, {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted
      })
    } catch (stripeError) {
      addLog('15', 'Failed to retrieve account from Stripe', stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error')
      
      // If account doesn't exist in Stripe, clean up our records
      if (stripeError instanceof Stripe.errors.StripeError && stripeError.code === 'account_invalid') {
        addLog('16', 'Account invalid in Stripe, cleaning up local records')
        await db.collection('connectedStripeAccounts').doc(userId).delete()
        await db.collection('users').doc(userId).update({
          stripeAccountId: admin.firestore.FieldValue.delete(),
          stripeAccountStatus: admin.firestore.FieldValue.delete(),
        })
      }
      
      return NextResponse.json({
        isUnconnected: true,
        message: 'Stripe account no longer valid',
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
          reason: 'Stripe account invalid or inaccessible'
        }
      })
    }

    const accountStatus = {
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      detailsSubmitted: account.details_submitted || false,
      requirementsCount: account.requirements?.currently_due?.length || 0,
      currentlyDue: account.requirements?.currently_due || [],
      pastDue: account.requirements?.past_due || [],
    }

    addLog('17', 'Account status determined', undefined, accountStatus)

    // If account is not fully set up, return limited data but mark as connected
    if (!accountStatus.chargesEnabled || !accountStatus.detailsSubmitted) {
      addLog('18', 'Account connected but not fully set up')
      return NextResponse.json({
        isUnconnected: false,
        accountNotReady: true,
        message: 'Stripe account setup incomplete',
        totalEarnings: 0,
        thisMonthEarnings: 0,
        lastMonthEarnings: 0,
        last30DaysEarnings: 0,
        pendingPayout: 0,
        availableBalance: 0,
        nextPayoutDate: null,
        payoutSchedule: account.settings?.payouts?.schedule?.interval || 'manual',
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

    // Account is fully set up, fetch earnings data
    addLog('19', 'Account fully set up, fetching earnings data')
    
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

    addLog('20', 'Successfully calculated earnings data')

    const earningsData = {
      totalEarnings,
      thisMonthEarnings,
      lastMonthEarnings,
      last30DaysEarnings,
      pendingPayout,
      availableBalance,
      nextPayoutDate: account.settings?.payouts?.schedule?.delay_days 
        ? new Date(Date.now() + account.settings.payouts.schedule.delay_days * 24 * 60 * 60 * 1000).toISOString()
        : null,
      payoutSchedule: account.settings?.payouts?.schedule?.interval || 'manual',
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
        reason: 'Successfully fetched live earnings data'
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
