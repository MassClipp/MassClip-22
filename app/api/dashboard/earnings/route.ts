export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { StripeEarningsService } from "@/lib/stripe-earnings-service"
import { ProductBoxSalesService } from "@/lib/product-box-sales-service"

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request.headers)

    console.log(`📊 Dashboard earnings API called for user: ${user.uid}`)

    // Try to get Stripe earnings data first (same as earnings page)
    let stripeData = null
    try {
      stripeData = await StripeEarningsService.getEarningsData(user.uid)
      console.log(`💳 Stripe data retrieved:`, {
        totalEarnings: stripeData?.totalEarnings,
        last30DaysEarnings: stripeData?.last30DaysEarnings,
        hasError: !!stripeData?.error,
      })
    } catch (error) {
      console.warn(`⚠️ Stripe data fetch failed:`, error)
    }

    // If Stripe data is available and valid, use it
    if (stripeData && !stripeData.error && stripeData.totalEarnings > 0) {
      const earningsData = {
        totalRevenue: stripeData.totalEarnings,
        totalSales: stripeData.salesMetrics?.totalSales || 0,
        thisMonthRevenue: stripeData.thisMonthEarnings,
        thisMonthSales: stripeData.salesMetrics?.thisMonthSales || 0,
        last30DaysRevenue: stripeData.last30DaysEarnings,
        last30DaysSales: stripeData.salesMetrics?.last30DaysSales || 0,
        averageTransactionValue: stripeData.salesMetrics?.averageTransactionValue || 0,
        recentSales:
          stripeData.recentTransactions?.slice(0, 10).map((txn) => ({
            id: txn.id,
            amount: txn.net,
            createdAt: txn.created,
            productBoxTitle: txn.description || "Stripe Transaction",
            status: "completed",
          })) || [],
        bestSellingProduct: null, // Stripe doesn't provide this easily
        lastUpdated: new Date(),
        source: "stripe",
      }

      console.log(`✅ Returning Stripe-based earnings data:`, {
        last30DaysRevenue: earningsData.last30DaysRevenue,
        last30DaysSales: earningsData.last30DaysSales,
      })

      return NextResponse.json(earningsData)
    }

    // Fallback to ProductBoxSalesService (Firestore)
    console.log(`📦 Falling back to ProductBoxSalesService`)
    const salesStats = await ProductBoxSalesService.getSalesStats(user.uid)

    const earningsData = {
      totalRevenue: salesStats.totalRevenue,
      totalSales: salesStats.totalSales,
      thisMonthRevenue: salesStats.thisMonthRevenue,
      thisMonthSales: salesStats.thisMonthSales,
      last30DaysRevenue: salesStats.last30DaysRevenue,
      last30DaysSales: salesStats.last30DaysSales,
      averageTransactionValue:
        salesStats.last30DaysSales > 0 ? salesStats.last30DaysRevenue / salesStats.last30DaysSales : 0,
      recentSales: salesStats.recentSales,
      bestSellingProduct: salesStats.bestSellingProductBox,
      lastUpdated: new Date(),
      source: "firestore",
    }

    console.log(`✅ Returning Firestore-based earnings data:`, {
      last30DaysRevenue: earningsData.last30DaysRevenue,
      last30DaysSales: earningsData.last30DaysSales,
    })

    return NextResponse.json(earningsData)
  } catch (error) {
    console.error("❌ Error fetching dashboard earnings:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch earnings data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
