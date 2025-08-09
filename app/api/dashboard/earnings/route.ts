export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    console.log("🏦 [Earnings API] Starting earnings fetch...")

    // Get authenticated user
    const user = await getAuthenticatedUser(request.headers)
    console.log(`👤 [Earnings API] User: ${user.uid}`)

    // Get user's Stripe account ID from Firebase
    const { db } = await import("@/lib/firebase-admin")
    const userDoc = await db.collection("users").doc(user.uid).get()

    if (!userDoc.exists) {
      console.log("❌ [Earnings API] User document not found")
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      )
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      console.log("⚠️ [Earnings API] No Stripe account connected")
      return NextResponse.json({
        success: true,
        data: {
          totalEarnings: 0,
          last30DaysEarnings: 0,
          thisMonthEarnings: 0,
          last30DaysSales: 0,
          thisMonthSales: 0,
          averageTransactionValue: 0,
          recentTransactions: [],
          salesMetrics: {
            last30DaysSales: 0,
            thisMonthSales: 0,
          },
        },
      })
    }

    console.log(`💳 [Earnings API] Using Stripe account: ${stripeAccountId}`)

    // Calculate date ranges
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Fetch charges from connected account
    console.log("📊 [Earnings API] Fetching charges from Stripe...")

    const charges = await stripe.charges.list(
      {
        limit: 100,
        created: {
          gte: Math.floor(thirtyDaysAgo.getTime() / 1000),
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    console.log(`💰 [Earnings API] Found ${charges.data.length} charges`)

    // Filter successful charges only
    const successfulCharges = charges.data.filter((charge) => charge.status === "succeeded" && charge.paid)

    console.log(`✅ [Earnings API] ${successfulCharges.length} successful charges`)

    // Calculate last 30 days metrics
    const last30DaysCharges = successfulCharges.filter((charge) => {
      const chargeDate = new Date(charge.created * 1000)
      return chargeDate >= thirtyDaysAgo
    })

    const last30DaysEarnings = last30DaysCharges.reduce((sum, charge) => {
      // Convert from cents to dollars and account for Stripe fees
      const grossAmount = charge.amount / 100
      const netAmount = grossAmount - (charge.application_fee_amount || 0) / 100
      return sum + netAmount
    }, 0)

    const last30DaysSales = last30DaysCharges.length

    // Calculate this month metrics
    const thisMonthCharges = successfulCharges.filter((charge) => {
      const chargeDate = new Date(charge.created * 1000)
      return chargeDate >= startOfMonth
    })

    const thisMonthEarnings = thisMonthCharges.reduce((sum, charge) => {
      const grossAmount = charge.amount / 100
      const netAmount = grossAmount - (charge.application_fee_amount || 0) / 100
      return sum + netAmount
    }, 0)

    const thisMonthSales = thisMonthCharges.length

    // Calculate total earnings (all time)
    const allTimeCharges = await stripe.charges.list(
      {
        limit: 100,
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    const totalEarnings = allTimeCharges.data
      .filter((charge) => charge.status === "succeeded" && charge.paid)
      .reduce((sum, charge) => {
        const grossAmount = charge.amount / 100
        const netAmount = grossAmount - (charge.application_fee_amount || 0) / 100
        return sum + netAmount
      }, 0)

    // Calculate average transaction value
    const averageTransactionValue = last30DaysSales > 0 ? last30DaysEarnings / last30DaysSales : 0

    // Get recent transactions for display
    const recentTransactions = successfulCharges.slice(0, 10).map((charge) => ({
      id: charge.id,
      amount: charge.amount / 100,
      netAmount: (charge.amount - (charge.application_fee_amount || 0)) / 100,
      created: new Date(charge.created * 1000).toISOString(),
      status: charge.status,
      description: charge.description || "Purchase",
      customer: charge.billing_details?.name || "Anonymous",
    }))

    const earningsData = {
      totalEarnings: Number(totalEarnings.toFixed(2)),
      last30DaysEarnings: Number(last30DaysEarnings.toFixed(2)),
      thisMonthEarnings: Number(thisMonthEarnings.toFixed(2)),
      last30DaysSales,
      thisMonthSales,
      averageTransactionValue: Number(averageTransactionValue.toFixed(2)),
      recentTransactions,
      salesMetrics: {
        last30DaysSales,
        thisMonthSales,
      },
    }

    console.log("📈 [Earnings API] Final earnings data:", {
      totalEarnings: earningsData.totalEarnings,
      last30DaysEarnings: earningsData.last30DaysEarnings,
      last30DaysSales: earningsData.last30DaysSales,
    })

    return NextResponse.json({
      success: true,
      data: earningsData,
    })
  } catch (error) {
    console.error("❌ [Earnings API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch earnings data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
