import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Earnings API] Starting earnings fetch...")

    // Get authenticated user
    const authUser = await getAuthenticatedUser(request.headers)
    const userId = authUser.uid
    console.log(`🔍 [Earnings API] Authenticated user: ${userId}`)

    // Get user's Stripe account ID
    const userDoc = await adminDb.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({ error: "No Stripe account connected" }, { status: 400 })
    }

    console.log(`🔍 [Earnings API] Fetching data for Stripe account: ${stripeAccountId}`)

    // Get current date ranges
    const now = new Date()
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const startOfThisWeek = new Date(now.setDate(now.getDate() - now.getDay()))

    // Fetch balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    })

    // Fetch charges (transactions)
    const charges = await stripe.charges.list(
      {
        limit: 100,
        created: {
          gte: Math.floor(startOfLastMonth.getTime() / 1000),
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    // Calculate metrics
    const allCharges = charges.data.filter((charge) => charge.status === "succeeded")
    const thisMonthCharges = allCharges.filter(
      (charge) => charge.created >= Math.floor(startOfThisMonth.getTime() / 1000),
    )
    const lastMonthCharges = allCharges.filter(
      (charge) =>
        charge.created >= Math.floor(startOfLastMonth.getTime() / 1000) &&
        charge.created < Math.floor(startOfThisMonth.getTime() / 1000),
    )
    const thisWeekCharges = allCharges.filter(
      (charge) => charge.created >= Math.floor(startOfThisWeek.getTime() / 1000),
    )

    const totalEarnings = allCharges.reduce((sum, charge) => sum + charge.amount, 0) / 100
    const thisMonth = thisMonthCharges.reduce((sum, charge) => sum + charge.amount, 0) / 100
    const lastMonth = lastMonthCharges.reduce((sum, charge) => sum + charge.amount, 0) / 100
    const thisWeek = thisWeekCharges.reduce((sum, charge) => sum + charge.amount, 0) / 100
    const totalTransactions = allCharges.length
    const averageOrderValue = totalTransactions > 0 ? totalEarnings / totalTransactions : 0

    // Get recent transactions
    const recentTransactions = allCharges.slice(0, 10).map((charge) => ({
      id: charge.id,
      amount: charge.amount / 100,
      customer: charge.billing_details?.name || charge.billing_details?.email || "Anonymous",
      product: charge.description || "Purchase",
      date: new Date(charge.created * 1000).toLocaleDateString(),
      status: charge.status,
    }))

    // Mock top products (you can enhance this with actual product data)
    const topProducts = [
      { name: "Premium Video Pack", sales: Math.floor(totalTransactions * 0.4), revenue: totalEarnings * 0.4 },
      { name: "Exclusive Content Bundle", sales: Math.floor(totalTransactions * 0.3), revenue: totalEarnings * 0.3 },
      { name: "Monthly Subscription", sales: Math.floor(totalTransactions * 0.3), revenue: totalEarnings * 0.3 },
    ].filter((product) => product.sales > 0)

    // Mock monthly data (you can enhance this with actual historical data)
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthCharges = allCharges.filter((charge) => {
        const chargeDate = new Date(charge.created * 1000)
        return chargeDate.getMonth() === date.getMonth() && chargeDate.getFullYear() === date.getFullYear()
      })

      monthlyData.push({
        month: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        revenue: monthCharges.reduce((sum, charge) => sum + charge.amount, 0) / 100,
        transactions: monthCharges.length,
      })
    }

    const response = {
      totalEarnings,
      thisMonth,
      lastMonth,
      thisWeek,
      totalTransactions,
      averageOrderValue,
      topProducts,
      recentTransactions,
      monthlyData,
      balance: {
        available: balance.available.reduce((sum, bal) => sum + bal.amount, 0) / 100,
        pending: balance.pending.reduce((sum, bal) => sum + bal.amount, 0) / 100,
      },
    }

    console.log(`✅ [Earnings API] Successfully fetched earnings data:`, {
      totalEarnings: response.totalEarnings,
      thisMonth: response.thisMonth,
      totalTransactions: response.totalTransactions,
      recentTransactionsCount: response.recentTransactions.length,
    })

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Earnings API] Error fetching earnings:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch earnings data",
        details: error.message,
        totalEarnings: 0,
        thisMonth: 0,
        lastMonth: 0,
        thisWeek: 0,
        totalTransactions: 0,
        averageOrderValue: 0,
        topProducts: [],
        recentTransactions: [],
        monthlyData: [],
      },
      { status: 500 },
    )
  }
}
