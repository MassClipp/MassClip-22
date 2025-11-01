import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request.headers)
    const userId = user.uid

    console.log("[v0] Fetching sales metrics for user:", userId)

    // Calculate date range for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Query bundlePurchases for completed sales in last 30 days
    const purchasesSnapshot = await db
      .collection("bundlePurchases")
      .where("creatorId", "==", userId)
      .where("status", "==", "completed")
      .get()

    let totalRevenueLast30Days = 0
    let totalSalesLast30Days = 0
    let totalRevenue = 0
    let totalSales = 0

    purchasesSnapshot.forEach((doc) => {
      const purchase = doc.data()

      // Convert timestamp to Date
      let purchaseDate: Date
      if (purchase.timestamp?.toDate) {
        purchaseDate = purchase.timestamp.toDate()
      } else if (purchase.timestamp?.seconds) {
        purchaseDate = new Date(purchase.timestamp.seconds * 1000)
      } else {
        purchaseDate = new Date(purchase.timestamp)
      }

      // Get revenue amount (use creator earnings after platform fees)
      const revenue = Number(
        purchase.creatorEarningsDollars ||
          purchase.creatorEarningsCents / 100 ||
          purchase.purchaseAmountDollars ||
          purchase.purchaseAmount / 100 ||
          0,
      )

      if (isNaN(revenue)) {
        console.warn("[v0] Invalid revenue amount in purchase:", doc.id)
        return
      }

      // Add to total counts
      totalRevenue += revenue
      totalSales += 1

      // Check if within last 30 days
      if (purchaseDate >= thirtyDaysAgo) {
        totalRevenueLast30Days += revenue
        totalSalesLast30Days += 1
      }
    })

    // Calculate average order value
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0

    const salesMetrics = {
      totalRevenueLast30Days: Number(totalRevenueLast30Days.toFixed(2)),
      totalSalesLast30Days,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
    }

    console.log("[v0] Sales metrics calculated:", salesMetrics)

    return NextResponse.json({
      success: true,
      sales: salesMetrics,
    })
  } catch (error) {
    console.error("[v0] Sales metrics API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sales metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
