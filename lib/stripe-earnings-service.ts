import Stripe from "stripe"

// Initialize Stripe with proper error handling
let stripe: Stripe | null = null

try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    })
  } else {
    console.warn("STRIPE_SECRET_KEY not found in environment variables")
  }
} catch (error) {
  console.error("Failed to initialize Stripe:", error)
}

export interface StripeEarningsData {
  totalEarnings: number
  thisMonthEarnings: number
  lastMonthEarnings: number
  last30DaysEarnings: number
  pendingPayout: number
  availableBalance: number
  nextPayoutDate: Date | null
  payoutSchedule: string
  accountStatus: {
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
    requirementsCount: number
    currentlyDue: string[]
    pastDue: string[]
  }
  recentTransactions: any[]
  payoutHistory: any[]
  monthlyBreakdown: {
    month: string
    earnings: number
    transactionCount: number
  }[]
  salesMetrics: {
    totalSales: number
    thisMonthSales: number
    last30DaysSales: number
    averageTransactionValue: number
    conversionRate: number
  }
  balanceBreakdown: {
    available: { amount: number; currency: string }[]
    pending: { amount: number; currency: string }[]
    reserved: { amount: number; currency: string }[]
  }
  error?: string | null
}

export class StripeEarningsService {
  /**
   * Get comprehensive earnings data from Stripe for a specific connected account
   * Returns null if account is not found or not accessible
   */
  static async getEarningsData(stripeAccountId: string): Promise<StripeEarningsData | null> {
    if (!stripe) {
      console.error("Stripe not initialized")
      return null
    }

    if (!stripeAccountId) {
      console.error("No Stripe account ID provided")
      return null
    }

    try {
      console.log(`💳 Fetching real Stripe earnings for account: ${stripeAccountId}`)

      // First, verify the account exists and is accessible
      let account: Stripe.Account
      try {
        account = await stripe.accounts.retrieve(stripeAccountId)
      } catch (accountError) {
        console.error(`Failed to retrieve Stripe account ${stripeAccountId}:`, accountError)
        return null
      }

      // Check if account is properly set up
      if (!account.charges_enabled || !account.details_submitted) {
        console.log(`Account ${stripeAccountId} not fully set up - charges_enabled: ${account.charges_enabled}, details_submitted: ${account.details_submitted}`)
        return null
      }

      // Get current date ranges
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))

      // Fetch balance
      const balance = await stripe.balance.retrieve({
        stripeAccount: stripeAccountId,
      })

      // Fetch recent charges for this month
      const thisMonthCharges = await stripe.charges.list({
        created: {
          gte: Math.floor(startOfMonth.getTime() / 1000),
        },
        limit: 100,
      }, {
        stripeAccount: stripeAccountId,
      })

      // Fetch last month charges
      const lastMonthCharges = await stripe.charges.list({
        created: {
          gte: Math.floor(startOfLastMonth.getTime() / 1000),
          lt: Math.floor(endOfLastMonth.getTime() / 1000),
        },
        limit: 100,
      }, {
        stripeAccount: stripeAccountId,
      })

      // Fetch last 30 days charges
      const last30DaysCharges = await stripe.charges.list({
        created: {
          gte: Math.floor(thirtyDaysAgo.getTime() / 1000),
        },
        limit: 100,
      }, {
        stripeAccount: stripeAccountId,
      })

      // Fetch all-time charges (limited to recent for performance)
      const allTimeCharges = await stripe.charges.list({
        limit: 100,
      }, {
        stripeAccount: stripeAccountId,
      })

      // Calculate earnings (net amounts after fees)
      const calculateEarnings = (charges: Stripe.Charge[]) => {
        return charges
          .filter(charge => charge.status === 'succeeded')
          .reduce((total, charge) => {
            // Get the net amount (amount minus fees)
            const netAmount = charge.amount - (charge.application_fee_amount || 0)
            return total + netAmount
          }, 0) / 100 // Convert from cents to dollars
      }

      const calculateSalesCount = (charges: Stripe.Charge[]) => {
        return charges.filter(charge => charge.status === 'succeeded').length
      }

      const thisMonthEarnings = calculateEarnings(thisMonthCharges.data)
      const lastMonthEarnings = calculateEarnings(lastMonthCharges.data)
      const last30DaysEarnings = calculateEarnings(last30DaysCharges.data)
      const totalEarnings = calculateEarnings(allTimeCharges.data)

      const thisMonthSales = calculateSalesCount(thisMonthCharges.data)
      const last30DaysSales = calculateSalesCount(last30DaysCharges.data)
      const totalSales = calculateSalesCount(allTimeCharges.data)

      // Calculate average transaction value
      const averageTransactionValue = totalSales > 0 ? totalEarnings / totalSales : 0

      // Get available and pending balances
      const availableBalance = balance.available.reduce((total, bal) => total + bal.amount, 0) / 100
      const pendingBalance = balance.pending.reduce((total, bal) => total + bal.amount, 0) / 100

      // Get recent transactions for display
      const recentTransactions = thisMonthCharges.data.slice(0, 10).map(charge => ({
        id: charge.id,
        amount: charge.amount / 100,
        net: (charge.amount - (charge.application_fee_amount || 0)) / 100,
        fee: (charge.application_fee_amount || 0) / 100,
        type: 'payment',
        description: charge.description || 'Payment',
        created: new Date(charge.created * 1000),
        status: charge.status === 'succeeded' ? 'available' : charge.status,
        currency: charge.currency.toUpperCase(),
      }))

      const earningsData: StripeEarningsData = {
        totalEarnings,
        thisMonthEarnings,
        lastMonthEarnings,
        last30DaysEarnings,
        availableBalance,
        pendingPayout: pendingBalance,
        nextPayoutDate: null, // Would need to fetch payout schedule
        payoutSchedule: "monthly",
        salesMetrics: {
          totalSales,
          thisMonthSales,
          last30DaysSales,
          averageTransactionValue,
          conversionRate: 0, // Would need additional data to calculate
        },
        accountStatus: {
          chargesEnabled: account.charges_enabled || false,
          payoutsEnabled: account.payouts_enabled || false,
          detailsSubmitted: account.details_submitted || false,
          requirementsCount: account.requirements?.currently_due?.length || 0,
          currentlyDue: account.requirements?.currently_due || [],
          pastDue: account.requirements?.past_due || [],
        },
        recentTransactions,
        payoutHistory: [], // Would need to fetch payouts
        monthlyBreakdown: [
          { 
            month: startOfLastMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), 
            earnings: lastMonthEarnings, 
            transactionCount: calculateSalesCount(lastMonthCharges.data) 
          },
          { 
            month: startOfMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), 
            earnings: thisMonthEarnings, 
            transactionCount: thisMonthSales 
          },
        ],
        balanceBreakdown: {
          available: balance.available.map(bal => ({ amount: bal.amount / 100, currency: bal.currency.toUpperCase() })),
          pending: balance.pending.map(bal => ({ amount: bal.amount / 100, currency: bal.currency.toUpperCase() })),
          reserved: [], // Would need to fetch reserved funds if any
        },
      }

      console.log(`✅ Successfully fetched real Stripe earnings for account ${stripeAccountId}`)
      return earningsData

    } catch (error) {
      console.error(`❌ Error fetching Stripe earnings for account ${stripeAccountId}:`, error)
      return null
    }
  }

  /**
   * Force refresh Stripe data
   */
  static async forceRefresh(stripeAccountId: string): Promise<StripeEarningsData | null> {
    return this.getEarningsData(stripeAccountId)
  }
}
