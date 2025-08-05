import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/firebase-admin"
import { StripeEarningsService } from "@/lib/stripe-earnings-service"

export async function GET(request: NextRequest) {
  try {
    console.log("[EarningsAPI] Starting earnings data fetch")

    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("[EarningsAPI] No valid session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    console.log(`[EarningsAPI] Fetching earnings for user: ${userId}`)

    // Get user's Stripe account ID from Firestore
    let userData = null
    try {
      const userDoc = await db.collection("users").doc(userId).get()
      userData = userDoc.data()
      console.log(`[EarningsAPI] User data retrieved:`, {
        exists: userDoc.exists,
        hasStripeAccount: !!userData?.stripeAccountId,
      })
    } catch (firestoreError) {
      console.error("[EarningsAPI] Firestore error:", firestoreError)
      return NextResponse.json(
        {
          error: "Database connection error",
          message: firestoreError instanceof Error ? firestoreError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }

    if (!userData?.stripeAccountId) {
      console.log(`[EarningsAPI] No Stripe account found for user ${userId}`)
      return NextResponse.json({
        error: "No Stripe account connected",
        isDemo: true,
        demoData: {
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
        },
      })
    }

    const stripeAccountId = userData.stripeAccountId
    console.log(`[EarningsAPI] Found Stripe account: ${stripeAccountId}`)

    // Fetch earnings data from Stripe
    let earningsData = null
    try {
      earningsData = await StripeEarningsService.getEarningsData(stripeAccountId)
    } catch (stripeError) {
      console.error("[EarningsAPI] Stripe service error:", stripeError)
      return NextResponse.json({
        error: "Stripe service error",
        message: stripeError instanceof Error ? stripeError.message : "Unknown Stripe error",
        isDemo: true,
        demoData: {
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
        },
      })
    }

    if (!earningsData) {
      console.log(`[EarningsAPI] No earnings data returned for account ${stripeAccountId}`)
      return NextResponse.json({
        error: "No earnings data available",
        isDemo: true,
        demoData: {
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
        },
      })
    }

    console.log(`[EarningsAPI] Successfully fetched earnings data:`, {
      totalEarnings: earningsData.totalEarnings,
      thisMonthEarnings: earningsData.thisMonthEarnings,
      availableBalance: earningsData.availableBalance,
      totalSales: earningsData.salesMetrics?.totalSales || 0,
      accountStatus: earningsData.accountStatus,
      hasError: !!earningsData.error,
    })

    // Return the earnings data with metadata
    return NextResponse.json({
      ...earningsData,
      isDemo: false,
      stripeAccountId,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[EarningsAPI] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        isDemo: true,
        demoData: {
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
        },
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[EarningsAPI] Force refresh earnings data")

    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's Stripe account ID
    let userData = null
    try {
      const userDoc = await db.collection("users").doc(userId).get()
      userData = userDoc.data()
    } catch (firestoreError) {
      console.error("[EarningsAPI] Firestore error on refresh:", firestoreError)
      return NextResponse.json(
        {
          error: "Database connection error",
          message: firestoreError instanceof Error ? firestoreError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }

    if (!userData?.stripeAccountId) {
      return NextResponse.json({ error: "No Stripe account connected" }, { status: 400 })
    }

    const stripeAccountId = userData.stripeAccountId

    // Force refresh earnings data
    let earningsData = null
    try {
      earningsData = await StripeEarningsService.forceRefresh(stripeAccountId)
    } catch (stripeError) {
      console.error("[EarningsAPI] Stripe refresh error:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to refresh earnings data",
          message: stripeError instanceof Error ? stripeError.message : "Unknown Stripe error",
        },
        { status: 500 },
      )
    }

    if (!earningsData) {
      return NextResponse.json({ error: "Failed to refresh earnings data" }, { status: 500 })
    }

    console.log(`[EarningsAPI] Successfully refreshed earnings data for account ${stripeAccountId}`)

    return NextResponse.json({
      ...earningsData,
      isDemo: false,
      stripeAccountId,
      lastUpdated: new Date().toISOString(),
      refreshed: true,
    })
  } catch (error) {
    console.error("[EarningsAPI] Error refreshing earnings:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
