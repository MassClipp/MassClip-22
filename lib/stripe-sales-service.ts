import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export class StripeSalesService {
  static async getSalesData(userId: string) {
    try {
      // Get the current date and calculate date ranges
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Get charges for the last 30 days
      const charges = await stripe.charges.list({
        created: {
          gte: Math.floor(thirtyDaysAgo.getTime() / 1000),
        },
        limit: 100,
      })

      // Filter charges for this user (you might need to adjust this based on your metadata structure)
      const userCharges = charges.data.filter((charge) => {
        return charge.metadata?.userId === userId || charge.metadata?.creatorId === userId
      })

      // Calculate statistics
      const totalSalesLast30Days = userCharges.length
      const totalRevenueLast30Days = userCharges.reduce((sum, charge) => sum + charge.amount, 0) / 100 // Convert from cents

      // This month's data
      const thisMonthCharges = userCharges.filter((charge) => {
        const chargeDate = new Date(charge.created * 1000)
        return chargeDate >= startOfMonth
      })

      const thisMonthSales = thisMonthCharges.length
      const thisMonthRevenue = thisMonthCharges.reduce((sum, charge) => sum + charge.amount, 0) / 100

      // Average order value
      const averageOrderValue = totalSalesLast30Days > 0 ? totalRevenueLast30Days / totalSalesLast30Days : 0

      // Recent transactions
      const recentTransactions = userCharges.slice(0, 10).map((charge) => ({
        id: charge.id,
        amount: charge.amount / 100,
        created: new Date(charge.created * 1000),
        status: charge.status,
      }))

      return {
        totalSalesLast30Days,
        totalRevenueLast30Days,
        thisMonthSales,
        thisMonthRevenue,
        averageOrderValue,
        recentTransactions,
      }
    } catch (error) {
      console.error("Error fetching Stripe sales data:", error)
      return {
        totalSalesLast30Days: 0,
        totalRevenueLast30Days: 0,
        thisMonthSales: 0,
        thisMonthRevenue: 0,
        averageOrderValue: 0,
        recentTransactions: [],
      }
    }
  }
}
