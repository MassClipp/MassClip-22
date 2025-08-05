import Stripe from "stripe"
import { safeNumber } from "./format-utils"

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
   * Get comprehensive earnings data from Stripe
   */
  static async getEarningsData(stripeAccountId: string): Promise<StripeEarningsData | null> {
    console.log(`💳 Fetching comprehensive Stripe earnings for account: ${stripeAccountId}`)

    // Default response with zeros
    const defaultResponse: StripeEarningsData = {
      totalEarnings: 0,
      thisMonthEarnings: 0,
      lastMonthEarnings: 0,
      last30DaysEarnings: 0,
      pendingPayout: 0,
      availableBalance: 0,
      nextPayoutDate: null,
      payoutSchedule: "monthly",
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
      error: null,
    }

    // Check if Stripe is initialized
    if (!stripe) {
      console.error("Stripe not initialized - missing STRIPE_SECRET_KEY")
      defaultResponse.error = "Stripe configuration error"
      return defaultResponse
    }

    // Validate account ID
    if (!stripeAccountId || typeof stripeAccountId !== "string") {
      console.error("Invalid Stripe account ID:", stripeAccountId)
      defaultResponse.error = "Invalid Stripe account ID"
      return defaultResponse
    }

    try {
      // Fetch all data in parallel for better performance
      const [account, balance, transactions, payouts, charges] = await Promise.allSettled([
        stripe.accounts.retrieve(stripeAccountId),
        stripe.balance.retrieve({ stripeAccount: stripeAccountId }),
        stripe.balanceTransactions.list({ limit: 100, expand: ["data.source"] }, { stripeAccount: stripeAccountId }),
        stripe.payouts.list({ limit: 50 }, { stripeAccount: stripeAccountId }),
        stripe.charges.list({ limit: 100 }, { stripeAccount: stripeAccountId }),
      ])

      // Handle account data
      if (account.status === "rejected") {
        console.error("Failed to fetch account:", account.reason)
        defaultResponse.error = "Failed to fetch account information"
        return defaultResponse
      }
      const accountData = account.value

      // Handle balance data
      let balanceData = null
      if (balance.status === "fulfilled") {
        balanceData = balance.value
      } else {
        console.warn("Failed to fetch balance:", balance.reason)
      }

      // Handle transactions data
      let transactionsData = { data: [] }
      if (transactions.status === "fulfilled") {
        transactionsData = transactions.value
      } else {
        console.warn("Failed to fetch transactions:", transactions.reason)
      }

      // Handle payouts data
      let payoutsData = { data: [] }
      if (payouts.status === "fulfilled") {
        payoutsData = payouts.value
      } else {
        console.warn("Failed to fetch payouts:", payouts.reason)
      }

      // Handle charges data
      let chargesData = { data: [] }
      if (charges.status === "fulfilled") {
        chargesData = charges.value
      } else {
        console.warn("Failed to fetch charges:", charges.reason)
      }

      console.log(`✅ Fetched Stripe data for account ${stripeAccountId}:`, {
        accountId: accountData.id,
        chargesEnabled: accountData.charges_enabled,
        payoutsEnabled: accountData.payouts_enabled,
        balanceAvailable: balanceData?.available?.length || 0,
        transactionCount: transactionsData.data.length,
        payoutCount: payoutsData.data.length,
        chargeCount: chargesData.data.length,
      })

      // Calculate date ranges
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const thisMonthTimestamp = Math.floor(thisMonth.getTime() / 1000)
      const lastMonthTimestamp = Math.floor(lastMonth.getTime() / 1000)
      const lastMonthEndTimestamp = Math.floor(lastMonthEnd.getTime() / 1000)
      const thirtyDaysAgoTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000)

      // Filter payment transactions
      const paymentTransactions = transactionsData.data.filter((txn) => txn.type === "payment")
      console.log(`📊 Found ${paymentTransactions.length} payment transactions`)

      // Calculate earnings
      const totalEarnings = paymentTransactions.reduce((sum, txn) => sum + (txn.net || 0), 0) / 100

      const thisMonthTransactions = paymentTransactions.filter((txn) => txn.created >= thisMonthTimestamp)
      const thisMonthEarnings = thisMonthTransactions.reduce((sum, txn) => sum + (txn.net || 0), 0) / 100

      const lastMonthTransactions = paymentTransactions.filter(
        (txn) => txn.created >= lastMonthTimestamp && txn.created <= lastMonthEndTimestamp,
      )
      const lastMonthEarnings = lastMonthTransactions.reduce((sum, txn) => sum + (txn.net || 0), 0) / 100

      const last30DaysTransactions = paymentTransactions.filter((txn) => txn.created >= thirtyDaysAgoTimestamp)
      const last30DaysEarnings = last30DaysTransactions.reduce((sum, txn) => sum + (txn.net || 0), 0) / 100

      // Calculate sales metrics
      const totalSales = paymentTransactions.length
      const thisMonthSales = thisMonthTransactions.length
      const last30DaysSales = last30DaysTransactions.length
      const averageTransactionValue = totalSales > 0 ? totalEarnings / totalSales : 0

      console.log(`💰 Calculated earnings:`, {
        totalEarnings,
        thisMonthEarnings,
        lastMonthEarnings,
        last30DaysEarnings,
        totalSales,
        thisMonthSales,
        last30DaysSales,
        averageTransactionValue,
      })

      // Calculate monthly breakdown for the last 12 months
      const monthlyBreakdown = []
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        const monthStart = Math.floor(monthDate.getTime() / 1000)
        const monthEnd = Math.floor(nextMonthDate.getTime() / 1000)

        const monthTransactions = paymentTransactions.filter(
          (txn) => txn.created >= monthStart && txn.created < monthEnd,
        )

        monthlyBreakdown.push({
          month: monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          earnings: monthTransactions.reduce((sum, txn) => sum + (txn.net || 0), 0) / 100,
          transactionCount: monthTransactions.length,
        })
      }

      // Balance breakdown
      const balanceBreakdown = {
        available:
          balanceData?.available?.map((bal) => ({
            amount: (bal.amount || 0) / 100,
            currency: (bal.currency || "usd").toUpperCase(),
          })) || [],
        pending:
          balanceData?.pending?.map((bal) => ({
            amount: (bal.amount || 0) / 100,
            currency: (bal.currency || "usd").toUpperCase(),
          })) || [],
        reserved:
          balanceData?.reserved?.map((bal) => ({
            amount: (bal.amount || 0) / 100,
            currency: (bal.currency || "usd").toUpperCase(),
          })) || [],
      }

      // Available and pending balances
      const availableBalance = balanceData?.available?.reduce((sum, bal) => sum + (bal.amount || 0), 0) / 100 || 0
      const pendingPayout = balanceData?.pending?.reduce((sum, bal) => sum + (bal.amount || 0), 0) / 100 || 0

      console.log(`💳 Balance info:`, {
        availableBalance,
        pendingPayout,
        availableCount: balanceData?.available?.length || 0,
        pendingCount: balanceData?.pending?.length || 0,
      })

      // Next payout date estimation
      let nextPayoutDate: Date | null = null
      if (accountData.settings?.payouts?.schedule?.interval === "daily") {
        nextPayoutDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      } else if (accountData.settings?.payouts?.schedule?.interval === "weekly") {
        nextPayoutDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      } else if (accountData.settings?.payouts?.schedule?.interval === "monthly") {
        nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      }

      // Account status
      const accountStatus = {
        chargesEnabled: accountData.charges_enabled || false,
        payoutsEnabled: accountData.payouts_enabled || false,
        detailsSubmitted: accountData.details_submitted || false,
        requirementsCount:
          (accountData.requirements?.currently_due?.length || 0) + (accountData.requirements?.past_due?.length || 0),
        currentlyDue: accountData.requirements?.currently_due || [],
        pastDue: accountData.requirements?.past_due || [],
      }

      // Recent transactions with enhanced details
      const recentTransactions = transactionsData.data.slice(0, 20).map((txn) => ({
        id: txn.id,
        amount: (txn.amount || 0) / 100,
        net: (txn.net || 0) / 100,
        fee: (txn.fee || 0) / 100,
        type: txn.type,
        description: txn.description || this.getTransactionDescription(txn),
        created: new Date((txn.created || 0) * 1000),
        status: txn.status,
        currency: (txn.currency || "usd").toUpperCase(),
        source: txn.source,
      }))

      // Enhanced payout history
      const payoutHistory = payoutsData.data.slice(0, 10).map((payout) => ({
        id: payout.id,
        amount: (payout.amount || 0) / 100,
        status: payout.status,
        arrivalDate: new Date((payout.arrival_date || 0) * 1000),
        created: new Date((payout.created || 0) * 1000),
        currency: (payout.currency || "usd").toUpperCase(),
        method: payout.method,
        type: payout.type,
        failureCode: payout.failure_code,
        failureMessage: payout.failure_message,
      }))

      const earningsData: StripeEarningsData = {
        totalEarnings: safeNumber(totalEarnings),
        thisMonthEarnings: safeNumber(thisMonthEarnings),
        lastMonthEarnings: safeNumber(lastMonthEarnings),
        last30DaysEarnings: safeNumber(last30DaysEarnings),
        pendingPayout: safeNumber(pendingPayout),
        availableBalance: safeNumber(availableBalance),
        nextPayoutDate,
        payoutSchedule: accountData.settings?.payouts?.schedule?.interval || "monthly",
        accountStatus,
        recentTransactions,
        payoutHistory,
        monthlyBreakdown,
        salesMetrics: {
          totalSales: safeNumber(totalSales),
          thisMonthSales: safeNumber(thisMonthSales),
          last30DaysSales: safeNumber(last30DaysSales),
          averageTransactionValue: safeNumber(averageTransactionValue),
          conversionRate: 0, // Would need additional data to calculate
        },
        balanceBreakdown,
      }

      console.log(`✅ Final earnings data for account ${stripeAccountId}:`, {
        totalEarnings: earningsData.totalEarnings,
        thisMonthEarnings: earningsData.thisMonthEarnings,
        totalSales: earningsData.salesMetrics.totalSales,
        availableBalance: earningsData.availableBalance,
        accountStatus: earningsData.accountStatus,
      })

      return earningsData
    } catch (stripeError) {
      console.error(`❌ Stripe API error for account ${stripeAccountId}:`, stripeError)
      defaultResponse.error = stripeError instanceof Error ? stripeError.message : "Stripe API error"
      return defaultResponse
    }
  }

  /**
   * Get a human-readable description for a transaction
   */
  private static getTransactionDescription(txn: any): string {
    if (txn.description) return txn.description

    switch (txn.type) {
      case "payment":
        return "Payment received"
      case "payout":
        return "Payout to bank account"
      case "adjustment":
        return "Balance adjustment"
      case "application_fee":
        return "Application fee"
      case "stripe_fee":
        return "Stripe processing fee"
      default:
        return `${txn.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`
    }
  }

  /**
   * Force refresh Stripe data (bypass cache)
   */
  static async forceRefresh(stripeAccountId: string): Promise<StripeEarningsData | null> {
    return this.getEarningsData(stripeAccountId)
  }
}
