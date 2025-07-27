import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { db } from "@/lib/firebase-admin"

// Helper function to safely convert to number
const safeNumber = (value: any): number => {
  if (value === null || value === undefined || value === "") return 0
  const num = Number(value)
  return isNaN(num) || !isFinite(num) ? 0 : num
}

// Helper function to safely convert to boolean
const safeBoolean = (value: any): boolean => {
  return Boolean(value)
}

// Default earnings structure - ensures all fields are always present
const createDefaultEarnings = () => ({
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
})

export async function GET(request: NextRequest) {
  try {
    console.log("📊 Earnings API called")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No authorization header")
      return NextResponse.json(
        {
          error: "Unauthorized",
          ...createDefaultEarnings(),
        },
        { status: 401 },
      )
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify the Firebase token
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(token)
    } catch (error) {
      console.log("❌ Invalid token:", error)
      return NextResponse.json(
        {
          error: "Invalid token",
          ...createDefaultEarnings(),
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    console.log(`📊 Fetching earnings data for user: ${userId}`)

    // Get user data to check for Stripe account
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData) {
      console.log(`❌ User not found: ${userId}`)
      return NextResponse.json(
        {
          error: "User not found",
          ...createDefaultEarnings(),
        },
        { status: 404 },
      )
    }

    // If no Stripe account, return defaults
    if (!userData.stripeAccountId) {
      console.log(`⚠️ No Stripe account found for user ${userId}`)
      return NextResponse.json({
        ...createDefaultEarnings(),
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

      console.log(`📅 Date ranges calculated:`, {
        thisMonth: thisMonth.toISOString(),
        lastMonth: lastMonth.toISOString(),
        thirtyDaysAgo: thirtyDaysAgo.toISOString(),
      })

      // Get purchases from Firestore
      const purchasesQuery = await db
        .collection("purchases")
        .where("creatorId", "==", userId)
        .where("status", "==", "completed")
        .get()

      const purchases = purchasesQuery.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          amount: safeNumber(data.amount),
        }
      })

      console.log(`📈 Found ${purchases.length} completed purchases for user ${userId}`)

      // Calculate earnings from purchases with safe number handling
      let totalEarnings = 0
      let thisMonthEarnings = 0
      let lastMonthEarnings = 0
      let last30DaysEarnings = 0
      let totalSales = 0
      let thisMonthSales = 0
      let last30DaysSales = 0

      purchases.forEach((purchase: any) => {
        const amount = safeNumber(purchase.amount)
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

      // Calculate average transaction value with safe division
      const averageTransactionValue = totalSales > 0 ? totalEarnings / totalSales : 0

      console.log(`💰 Calculated earnings:`, {
        totalEarnings,
        thisMonthEarnings,
        totalSales,
        averageTransactionValue,
      })

      // Get recent transactions (last 10) with safe data handling
      const recentTransactions = purchases
        .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10)
        .map((purchase: any) => ({
          id: purchase.id || "unknown",
          amount: safeNumber(purchase.amount),
          description: purchase.productBoxTitle || purchase.bundleTitle || "Purchase",
          created: purchase.createdAt,
          status: "completed",
          currency: "USD",
        }))

      // Build monthly breakdown for last 6 months with safe calculations
      const monthlyBreakdown = []
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

        const monthPurchases = purchases.filter((purchase: any) => {
          const purchaseDate = purchase.createdAt
          return purchaseDate >= monthDate && purchaseDate < nextMonthDate
        })

        const monthEarnings = monthPurchases.reduce((sum: number, purchase: any) => {
          return sum + safeNumber(purchase.amount)
        }, 0)

        monthlyBreakdown.push({
          month: monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          earnings: safeNumber(monthEarnings),
          transactionCount: monthPurchases.length,
        })
      }

      // Build the final earnings data with all safe conversions
      const earningsData = {
        totalEarnings: safeNumber(totalEarnings),
        thisMonthEarnings: safeNumber(thisMonthEarnings),
        lastMonthEarnings: safeNumber(lastMonthEarnings),
        last30DaysEarnings: safeNumber(last30DaysEarnings),
        pendingPayout: 0, // Would need Stripe API for actual pending amount
        availableBalance: 0, // Would need Stripe API for actual available balance
        salesMetrics: {
          totalSales: safeNumber(totalSales),
          thisMonthSales: safeNumber(thisMonthSales),
          last30DaysSales: safeNumber(last30DaysSales),
          averageTransactionValue: safeNumber(averageTransactionValue),
        },
        accountStatus: {
          chargesEnabled: safeBoolean(userData.stripeAccountStatus?.chargesEnabled),
          payoutsEnabled: safeBoolean(userData.stripeAccountStatus?.payoutsEnabled),
          detailsSubmitted: safeBoolean(userData.stripeAccountStatus?.detailsSubmitted),
          requirementsCount: safeNumber(userData.stripeAccountStatus?.requirementsCount),
        },
        recentTransactions,
        payoutHistory: [], // Would need Stripe API for actual payout history
        monthlyBreakdown,
      }

      console.log(`✅ Earnings data calculated successfully for user ${userId}:`, {
        totalEarnings: earningsData.totalEarnings,
        totalSales: earningsData.salesMetrics.totalSales,
        dataStructure: Object.keys(earningsData),
      })

      return NextResponse.json(earningsData)
    } catch (calculationError) {
      console.error(`❌ Error calculating earnings for user ${userId}:`, calculationError)

      // Return default data on calculation error
      return NextResponse.json({
        ...createDefaultEarnings(),
        error: "Failed to calculate earnings data",
        details: calculationError instanceof Error ? calculationError.message : "Unknown calculation error",
      })
    }
  } catch (error) {
    console.error("❌ Earnings API error:", error)

    // Always return a properly structured response, even on complete failure
    return NextResponse.json(
      {
        ...createDefaultEarnings(),
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    )
  }
}
