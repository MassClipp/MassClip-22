import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, limit } from "firebase/firestore"

export interface ProductBoxSale {
  id: string
  productBoxId: string
  productBoxTitle: string
  amount: number
  currency: string
  buyerEmail: string
  createdAt: Date
  status: "completed" | "pending" | "failed"
  stripePaymentIntentId?: string
}

export interface ProductBoxSalesStats {
  totalSales: number
  totalRevenue: number
  thisMonthSales: number
  thisMonthRevenue: number
  last30DaysSales: number
  last30DaysRevenue: number
  bestSellingProductBox: {
    id: string
    title: string
    sales: number
    revenue: number
  } | null
  recentSales: ProductBoxSale[]
}

export class ProductBoxSalesService {
  static async getSalesStats(creatorId: string): Promise<ProductBoxSalesStats> {
    try {
      // Use a simpler query that doesn't require composite indexes
      // First get all sales for this creator
      const salesQuery = query(
        collection(db, "productBoxSales"),
        where("creatorId", "==", creatorId),
        limit(1000), // Limit to prevent large data fetches
      )

      const salesSnapshot = await getDocs(salesQuery)
      const allSales: ProductBoxSale[] = salesSnapshot.docs
        .map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
          } as ProductBoxSale
        })
        .filter((sale) => sale.status === "completed") // Filter completed sales in memory

      // Calculate date ranges
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Filter sales by time periods
      const thisMonthSales = allSales.filter((sale) => sale.createdAt >= startOfMonth)
      const last30DaysSales = allSales.filter((sale) => sale.createdAt >= thirtyDaysAgo)

      // Calculate totals
      const totalSales = allSales.length
      const totalRevenue = allSales.reduce((sum, sale) => sum + sale.amount, 0)
      const thisMonthRevenue = thisMonthSales.reduce((sum, sale) => sum + sale.amount, 0)
      const last30DaysRevenue = last30DaysSales.reduce((sum, sale) => sum + sale.amount, 0)

      // Find best selling product box
      const productBoxSales = new Map<string, { title: string; sales: number; revenue: number }>()

      allSales.forEach((sale) => {
        const existing = productBoxSales.get(sale.productBoxId) || {
          title: sale.productBoxTitle,
          sales: 0,
          revenue: 0,
        }
        existing.sales += 1
        existing.revenue += sale.amount
        productBoxSales.set(sale.productBoxId, existing)
      })

      let bestSellingProductBox = null
      let maxSales = 0

      for (const [id, data] of productBoxSales.entries()) {
        if (data.sales > maxSales) {
          maxSales = data.sales
          bestSellingProductBox = { id, ...data }
        }
      }

      // Sort sales by date for recent sales
      const sortedSales = allSales.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      return {
        totalSales,
        totalRevenue: totalRevenue / 100, // Convert from cents
        thisMonthSales: thisMonthSales.length,
        thisMonthRevenue: thisMonthRevenue / 100,
        last30DaysSales: last30DaysSales.length,
        last30DaysRevenue: last30DaysRevenue / 100,
        bestSellingProductBox: bestSellingProductBox
          ? {
              ...bestSellingProductBox,
              revenue: bestSellingProductBox.revenue / 100,
            }
          : null,
        recentSales: sortedSales.slice(0, 5).map((sale) => ({
          ...sale,
          amount: sale.amount / 100,
        })),
      }
    } catch (error) {
      console.error("Error fetching product box sales stats:", error)
      return {
        totalSales: 0,
        totalRevenue: 0,
        thisMonthSales: 0,
        thisMonthRevenue: 0,
        last30DaysSales: 0,
        last30DaysRevenue: 0,
        bestSellingProductBox: null,
        recentSales: [],
      }
    }
  }

  static async getTopProductBoxes(creatorId: string, limit = 5) {
    try {
      // Simple query without composite index requirements
      const salesQuery = query(
        collection(db, "productBoxSales"),
        where("creatorId", "==", creatorId),
        limit(500), // Reasonable limit
      )

      const salesSnapshot = await getDocs(salesQuery)
      const sales = salesSnapshot.docs.map((doc) => doc.data()).filter((sale) => sale.status === "completed") // Filter in memory

      // Group by product box and calculate metrics
      const productBoxMetrics = new Map()

      sales.forEach((sale) => {
        const existing = productBoxMetrics.get(sale.productBoxId) || {
          id: sale.productBoxId,
          title: sale.productBoxTitle,
          sales: 0,
          revenue: 0,
          lastSale: null,
        }

        existing.sales += 1
        existing.revenue += sale.amount / 100
        existing.lastSale = sale.createdAt?.toDate() || new Date()

        productBoxMetrics.set(sale.productBoxId, existing)
      })

      return Array.from(productBoxMetrics.values())
        .sort((a, b) => b.sales - a.sales)
        .slice(0, limit)
    } catch (error) {
      console.error("Error fetching top product boxes:", error)
      return []
    }
  }

  // Alternative method using purchases collection if productBoxSales doesn't exist
  static async getSalesStatsFromPurchases(creatorId: string): Promise<ProductBoxSalesStats> {
    try {
      // Try to get data from purchases collection instead
      const purchasesQuery = query(collection(db, "purchases"), where("creatorId", "==", creatorId), limit(1000))

      const purchasesSnapshot = await getDocs(purchasesQuery)
      const allPurchases = purchasesSnapshot.docs
        .map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            productBoxId: data.productId || data.productBoxId,
            productBoxTitle: data.productTitle || data.productBoxTitle || "Unknown Product",
            amount: data.amount || 0,
            currency: data.currency || "usd",
            buyerEmail: data.buyerEmail || data.customerEmail || "",
            createdAt: data.createdAt?.toDate() || new Date(),
            status: data.status || "completed",
          } as ProductBoxSale
        })
        .filter((purchase) => purchase.status === "completed")

      // Use the same calculation logic as above
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const thisMonthSales = allPurchases.filter((sale) => sale.createdAt >= startOfMonth)
      const last30DaysSales = allPurchases.filter((sale) => sale.createdAt >= thirtyDaysAgo)

      const totalSales = allPurchases.length
      const totalRevenue = allPurchases.reduce((sum, sale) => sum + sale.amount, 0)
      const thisMonthRevenue = thisMonthSales.reduce((sum, sale) => sum + sale.amount, 0)
      const last30DaysRevenue = last30DaysSales.reduce((sum, sale) => sum + sale.amount, 0)

      // Find best selling product
      const productBoxSales = new Map<string, { title: string; sales: number; revenue: number }>()

      allPurchases.forEach((sale) => {
        const existing = productBoxSales.get(sale.productBoxId) || {
          title: sale.productBoxTitle,
          sales: 0,
          revenue: 0,
        }
        existing.sales += 1
        existing.revenue += sale.amount
        productBoxSales.set(sale.productBoxId, existing)
      })

      let bestSellingProductBox = null
      let maxSales = 0

      for (const [id, data] of productBoxSales.entries()) {
        if (data.sales > maxSales) {
          maxSales = data.sales
          bestSellingProductBox = { id, ...data }
        }
      }

      const sortedSales = allPurchases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      return {
        totalSales,
        totalRevenue: totalRevenue / 100,
        thisMonthSales: thisMonthSales.length,
        thisMonthRevenue: thisMonthRevenue / 100,
        last30DaysSales: last30DaysSales.length,
        last30DaysRevenue: last30DaysRevenue / 100,
        bestSellingProductBox: bestSellingProductBox
          ? {
              ...bestSellingProductBox,
              revenue: bestSellingProductBox.revenue / 100,
            }
          : null,
        recentSales: sortedSales.slice(0, 5).map((sale) => ({
          ...sale,
          amount: sale.amount / 100,
        })),
      }
    } catch (error) {
      console.error("Error fetching sales stats from purchases:", error)
      return {
        totalSales: 0,
        totalRevenue: 0,
        thisMonthSales: 0,
        thisMonthRevenue: 0,
        last30DaysSales: 0,
        last30DaysRevenue: 0,
        bestSellingProductBox: null,
        recentSales: [],
      }
    }
  }
}
