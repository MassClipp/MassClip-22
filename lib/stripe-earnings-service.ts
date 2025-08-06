import Stripe from "stripe"
import { createDefaultEarningsData } from "./format-utils"

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
   * Currently returns demo data to avoid 500 errors during debugging
   */
  static async getEarningsData(stripeAccountId: string): Promise<StripeEarningsData | null> {
    console.log(`💳 [DEMO MODE] Simulating Stripe earnings for account: ${stripeAccountId}`)

    // Return demo data structure
    const demoData = createDefaultEarningsData()

    // Add some sample data to make it look realistic
    const earningsData: StripeEarningsData = {
      ...demoData,
      totalEarnings: 1250.75,
      thisMonthEarnings: 320.5,
      lastMonthEarnings: 280.25,
      last30DaysEarnings: 420.8,
      availableBalance: 150.25,
      pendingPayout: 170.25,
      salesMetrics: {
        totalSales: 45,
        thisMonthSales: 12,
        last30DaysSales: 18,
        averageTransactionValue: 27.79,
        conversionRate: 0,
      },
      monthlyBreakdown: [
        { month: "Jan 2025", earnings: 280.25, transactionCount: 10 },
        { month: "Feb 2025", earnings: 320.5, transactionCount: 12 },
      ],
      recentTransactions: [
        {
          id: "demo_txn_1",
          amount: 29.99,
          net: 28.42,
          fee: 1.57,
          type: "payment",
          description: "Premium Content Purchase",
          created: new Date(),
          status: "available",
          currency: "USD",
        },
      ],
    }

    console.log(`✅ [DEMO MODE] Returning sample earnings data`)
    return earningsData
  }

  /**
   * Force refresh Stripe data (demo mode)
   */
  static async forceRefresh(stripeAccountId: string): Promise<StripeEarningsData | null> {
    return this.getEarningsData(stripeAccountId)
  }
}
