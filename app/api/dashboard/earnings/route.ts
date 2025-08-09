export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import Stripe from "stripe"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()
const auth = getAuth()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

// Helper function to safely convert to number
function safeNumber(value: any): number {
  if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed
    }
  }
  return 0
}

// Helper function to get connected Stripe account
async function getConnectedStripeAccount(userId: string) {
  try {
    const userDoc = await db.collection("users").doc(userId).get()
    if (userDoc.exists) {
      const userData = userDoc.data()
      return userData?.stripeAccountId || null
    }
    return null
  } catch (error) {
    console.error(`❌ [Earnings] Error fetching user data:`, error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`🔍 [Earnings] Fetching earnings data for user: ${userId}`)

    // Get connected Stripe account
    const stripeAccountId = await getConnectedStripeAccount(userId)

    if (!stripeAccountId) {
      console.log(`⚠️ [Earnings] No connected Stripe account found for user: ${userId}`)
      return NextResponse.json({
        totalEarnings: 0,
        grossSales: 0,
        totalPlatformFees: 0,
        thisMonth: 0,
        thisMonthGross: 0,
        thisMonthPlatformFees: 0,
        availableBalance: 0,
        totalSales: 0,
        avgOrderValue: 0,
        monthlyGrowth: 0,
        last30Days: 0,
        last30DaysGross: 0,
        last30DaysPlatformFees: 0,
        thisMonthSales: 0,
        last30DaysSales: 0,
        pendingPayout: 0,
        accountStatus: "Not Connected",
        stripeAccountId: null,
        connectedAccountData: null,
      })
    }

    console.log(`💳 [Earnings] Using Stripe account: ${stripeAccountId}`)

    // Get date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Fetch charges from Stripe
    console.log("📊 [Earnings] Fetching charges from Stripe...")

    // Get last 3 months of charges for comprehensive data
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    const charges = await stripe.charges.list(
      {
        limit: 100,
        created: {
          gte: Math.floor(threeMonthsAgo.getTime() / 1000),
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    console.log(`💰 [Earnings] Found ${charges.data.length} charges`)

    // Filter successful charges only
    const successfulCharges = charges.data.filter((charge) => charge.status === "succeeded" && charge.paid)

    console.log(`✅ [Earnings] ${successfulCharges.length} successful charges`)

    // Calculate metrics
    let totalEarnings = 0
    let grossSales = 0
    let totalPlatformFees = 0
    let thisMonth = 0
    let thisMonthGross = 0
    let thisMonthPlatformFees = 0
    let lastMonth = 0
    let lastMonthGross = 0
    let last30Days = 0
    let last30DaysGross = 0
    let last30DaysPlatformFees = 0
    let totalSales = 0
    let thisMonthSales = 0
    let last30DaysSales = 0

    successfulCharges.forEach((charge) => {
      const chargeDate = new Date(charge.created * 1000)
      const grossAmount = safeNumber(charge.amount / 100)
      const platformFee = safeNumber((charge.application_fee_amount || 0) / 100)
      const netAmount = grossAmount - platformFee

      // Add to totals
      totalEarnings += netAmount
      grossSales += grossAmount
      totalPlatformFees += platformFee
      totalSales += 1

      // This month
      if (chargeDate >= startOfMonth) {
        thisMonth += netAmount
        thisMonthGross += grossAmount
        thisMonthPlatformFees += platformFee
        thisMonthSales += 1
      }

      // Last month
      if (chargeDate >= startOfLastMonth && chargeDate <= endOfLastMonth) {
        lastMonth += netAmount
        lastMonthGross += grossAmount
      }

      // Last 30 days
      if (chargeDate >= thirtyDaysAgo) {
        last30Days += netAmount
        last30DaysGross += grossAmount
        last30DaysPlatformFees += platformFee
        last30DaysSales += 1
      }
    })

    // Fetch balance from Stripe
    let balance
    try {
      balance = await stripe.balance.retrieve({
        stripeAccount: stripeAccountId,
      })
    } catch (error) {
      console.error(`❌ [Earnings] Error fetching Stripe balance:`, error)
      balance = { available: [], pending: [] }
    }

    // Calculate available balance (in dollars)
    const availableBalance = safeNumber(balance.available?.reduce((sum, bal) => sum + (bal.amount || 0), 0) / 100 || 0)
    const pendingPayout = safeNumber(balance.pending?.reduce((sum, bal) => sum + (bal.amount || 0), 0) / 100 || 0)

    // Calculate growth percentage (based on net earnings)
    const monthlyGrowth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0

    // Calculate average order value (based on gross sales)
    const avgOrderValue = totalSales > 0 ? grossSales / totalSales : 0

    // Account status
    const accountStatus = "Active"

    const earningsData = {
      // Net earnings (after platform fees)
      totalEarnings: safeNumber(totalEarnings),
      thisMonth: safeNumber(thisMonth),
      last30Days: safeNumber(last30Days),

      // Gross sales (before platform fees)
      grossSales: safeNumber(grossSales),
      thisMonthGross: safeNumber(thisMonthGross),
      last30DaysGross: safeNumber(last30DaysGross),

      // Platform fees
      totalPlatformFees: safeNumber(totalPlatformFees),
      thisMonthPlatformFees: safeNumber(thisMonthPlatformFees),
      last30DaysPlatformFees: safeNumber(last30DaysPlatformFees),

      // Stripe balance
      availableBalance: safeNumber(availableBalance),
      pendingPayout: safeNumber(pendingPayout),

      // Sales metrics
      totalSales: safeNumber(totalSales),
      thisMonthSales: safeNumber(thisMonthSales),
      last30DaysSales: safeNumber(last30DaysSales),
      avgOrderValue: safeNumber(avgOrderValue),
      monthlyGrowth: safeNumber(monthlyGrowth),

      // Account info
      accountStatus,
      stripeAccountId,
      connectedAccountData: { stripe_user_id: stripeAccountId },
    }

    console.log(`✅ [Earnings] Data compiled successfully:`, {
      totalEarnings: earningsData.totalEarnings,
      grossSales: earningsData.grossSales,
      totalPlatformFees: earningsData.totalPlatformFees,
      thisMonth: earningsData.thisMonth,
      thisMonthGross: earningsData.thisMonthGross,
      availableBalance: earningsData.availableBalance,
      totalSales: earningsData.totalSales,
      accountStatus: earningsData.accountStatus,
    })

    return NextResponse.json(earningsData)
  } catch (error) {
    console.error("❌ [Earnings] Error:", error)

    // Return safe default values on error
    return NextResponse.json({
      totalEarnings: 0,
      grossSales: 0,
      totalPlatformFees: 0,
      thisMonth: 0,
      thisMonthGross: 0,
      thisMonthPlatformFees: 0,
      availableBalance: 0,
      totalSales: 0,
      avgOrderValue: 0,
      monthlyGrowth: 0,
      last30Days: 0,
      last30DaysGross: 0,
      last30DaysPlatformFees: 0,
      thisMonthSales: 0,
      last30DaysSales: 0,
      pendingPayout: 0,
      accountStatus: "Error",
      stripeAccountId: null,
      connectedAccountData: null,
      error: "Failed to fetch earnings data",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
