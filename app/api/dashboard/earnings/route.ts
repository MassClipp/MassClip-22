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
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

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
        },
      })
    }

    const stripeAccountId = userData.stripeAccountId
    console.log(`[EarningsAPI] Found Stripe account: ${stripeAccountId}`)

    // Fetch earnings data from Stripe
    const earningsData = await StripeEarningsService.getEarningsData(stripeAccountId)

    if (!earningsData) {
      console.log(`[EarningsAPI] Failed to fetch earnings data for account ${stripeAccountId}`)
      return NextResponse.json({ error: "Failed to fetch earnings data" }, { status: 500 })
    }

    console.log(`[EarningsAPI] Successfully fetched earnings data:`, {
      totalEarnings: earningsData.totalEarnings,
      thisMonthEarnings: earningsData.thisMonthEarnings,
      availableBalance: earningsData.availableBalance,
      totalSales: earningsData.salesMetrics.totalSales,
      accountStatus: earningsData.accountStatus,
    })

    // Return the earnings data with metadata
    return NextResponse.json({
      ...earningsData,
      isDemo: false,
      stripeAccountId,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[EarningsAPI] Error fetching earnings:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
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
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      return NextResponse.json({ error: "No Stripe account connected" }, { status: 400 })
    }

    const stripeAccountId = userData.stripeAccountId

    // Force refresh earnings data
    const earningsData = await StripeEarningsService.forceRefresh(stripeAccountId)

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
