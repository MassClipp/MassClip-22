import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify the Firebase token
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`📊 Fetching earnings data for user: ${userId}`)

    // Get user data to check for Stripe account
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Default earnings structure
    const defaultEarnings = {
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
      },
      accountStatus: {
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requirementsCount: 0,
      },
      recentTransactions: [],
      payoutHistory: [],
      monthlyBreakdown: [],
    }

    // If no Stripe account, return defaults
    if (!userData.stripeAccountId) {
      console.log(`⚠️ No Stripe account found for user ${userId}`)
      return NextResponse.json({
        ...defaultEarnings,
        message: "No Stripe account connected",
      })
    }

    try {
      // Calculate date ranges
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Get purchases from Firestore
      const purchasesQuery = await db
        .collection("purchases")
        .where("creatorId", "==", userId)
        .where("status", "==", "completed")
        .get()

      const purchases = purchasesQuery.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }))

      console.log(`📈 Found ${purchases.length} completed purchases for user ${userId}`)

      // Calculate earnings from purchases
      let totalEarnings = 0
      let thisMonthEarnings = 0
      let lastMonthEarnings = 0
      let last30DaysEarnings = 0
      let totalSales = 0
      let thisMonthSales = 0
      let last30DaysSales = 0

      purchases.forEach((purchase: any) => {
        const amount = Number(purchase.amount) || 0
        const createdAt = purchase.createdAt

        if (amount > 0) {
          totalEarnings += amount
          totalSales += 1

          if (createdAt >= thisMonth) {
            thisMonthEarnings += amount
            thisMonthSales += 1
          }

          if (createdAt >= lastMonth && createdAt <= lastMonthEnd) {
            lastMonthEarnings += amount
          }

          if (createdAt >= thirtyDaysAgo) {
            last30DaysEarnings += amount
            last30DaysSales += 1
          }
        }
      })

      // Calculate average transaction value
      const averageTransactionValue = totalSales > 0 ? totalEarnings / totalSales : 0

      // Get recent transactions (last 10)
      const recentTransactions = purchases
        .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10)
        .map((purchase: any) => ({
          id: purchase.id,
          amount: Number(purchase.amount) || 0,
          description: purchase.productBoxTitle || purchase.bundleTitle || "Purchase",
          created: purchase.createdAt,
          status: "completed",
          currency: "USD",
        }))

      // Build monthly breakdown for last 6 months
      const monthlyBreakdown = []
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

        const monthPurchases = purchases.filter((purchase: any) => {
          const purchaseDate = purchase.createdAt
          return purchaseDate >= monthDate && purchaseDate < nextMonthDate
        })

        const monthEarnings = monthPurchases.reduce((sum: number, purchase: any) => {
          return sum + (Number(purchase.amount) || 0)
        }, 0)

        monthlyBreakdown.push({
          month: monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          earnings: monthEarnings,
          transactionCount: monthPurchases.length,
        })
      }

      const earningsData = {
        totalEarnings: Number(totalEarnings) || 0,
        thisMonthEarnings: Number(thisMonthEarnings) || 0,
        lastMonthEarnings: Number(lastMonthEarnings) || 0,
        last30DaysEarnings: Number(last30DaysEarnings) || 0,
        pendingPayout: 0, // Would need Stripe API for actual pending amount
        availableBalance: 0, // Would need Stripe API for actual available balance
        salesMetrics: {
          totalSales: Number(totalSales) || 0,
          thisMonthSales: Number(thisMonthSales) || 0,
          last30DaysSales: Number(last30DaysSales) || 0,
          averageTransactionValue: Number(averageTransactionValue) || 0,
        },
        accountStatus: {
          chargesEnabled: Boolean(userData.stripeAccountStatus?.chargesEnabled),
          payoutsEnabled: Boolean(userData.stripeAccountStatus?.payoutsEnabled),
          detailsSubmitted: Boolean(userData.stripeAccountStatus?.detailsSubmitted),
          requirementsCount: Number(userData.stripeAccountStatus?.requirementsCount) || 0,
        },
        recentTransactions,
        payoutHistory: [], // Would need Stripe API for actual payout history
        monthlyBreakdown,
      }

      console.log(`✅ Earnings data calculated for user ${userId}:`, {
        totalEarnings: earningsData.totalEarnings,
        totalSales: earningsData.salesMetrics.totalSales,
      })

      return NextResponse.json(earningsData)
    } catch (error) {
      console.error(`❌ Error calculating earnings for user ${userId}:`, error)

      // Return default data on error
      return NextResponse.json({
        ...defaultEarnings,
        error: "Failed to calculate earnings data",
      })
    }
  } catch (error) {
    console.error("❌ Earnings API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
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
        },
        accountStatus: {
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          requirementsCount: 0,
        },
        recentTransactions: [],
        payoutHistory: [],
        monthlyBreakdown: [],
      },
      { status: 500 },
    )
  }
}
