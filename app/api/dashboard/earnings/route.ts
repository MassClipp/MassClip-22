import { NextRequest, NextResponse } from "next/server"
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

// Helper function to get connected Stripe account
async function getConnectedStripeAccount(userId: string) {
  try {
    const connectedAccountDoc = await db.collection("connectedStripeAccounts").doc(userId).get()
    if (connectedAccountDoc.exists) {
      const accountData = connectedAccountDoc.data()
      console.log(`✅ [Earnings] Found connected Stripe account:`, {
        userId,
        stripe_user_id: accountData?.stripe_user_id,
        charges_enabled: accountData?.charges_enabled,
        details_submitted: accountData?.details_submitted,
      })
      return accountData
    }
    return null
  } catch (error) {
    console.error(`❌ [Earnings] Error fetching connected account:`, error)
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
    const connectedAccount = await getConnectedStripeAccount(userId)
    
    if (!connectedAccount || !connectedAccount.stripe_user_id) {
      console.log(`⚠️ [Earnings] No connected Stripe account found for user: ${userId}`)
      return NextResponse.json({
        totalEarnings: 0,
        thisMonth: 0,
        availableBalance: 0,
        totalSales: 0,
        avgOrderValue: 0,
        monthlyGrowth: 0,
        last30Days: 0,
        thisMonthSales: 0,
        last30DaysSales: 0,
        pendingPayout: 0,
        accountStatus: "Not Connected",
        stripeAccountId: null,
        connectedAccountData: null,
      })
    }

    const stripeAccountId = connectedAccount.stripe_user_id

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
    const availableBalance = balance.available?.reduce((sum, bal) => sum + bal.amount, 0) / 100 || 0
    const pendingPayout = balance.pending?.reduce((sum, bal) => sum + bal.amount, 0) / 100 || 0

    // Get date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Fetch payment intents from Stripe for earnings calculation
    let totalEarnings = 0
    let thisMonth = 0
    let lastMonth = 0
    let last30Days = 0
    let totalSales = 0
    let thisMonthSales = 0
    let last30DaysSales = 0

    try {
      // Get all successful payment intents
      const paymentIntents = await stripe.paymentIntents.list(
        {
          limit: 100,
          created: {
            gte: Math.floor(startOfLastMonth.getTime() / 1000),
          },
        },
        {
          stripeAccount: stripeAccountId,
        }
      )

      for (const pi of paymentIntents.data) {
        if (pi.status === "succeeded") {
          const amount = pi.amount / 100 // Convert to dollars
          const createdDate = new Date(pi.created * 1000)

          totalEarnings += amount
          totalSales += 1

          if (createdDate >= startOfMonth) {
            thisMonth += amount
            thisMonthSales += 1
          }

          if (createdDate >= startOfLastMonth && createdDate <= endOfLastMonth) {
            lastMonth += amount
          }

          if (createdDate >= thirtyDaysAgo) {
            last30Days += amount
            last30DaysSales += 1
          }
        }
      }
    } catch (error) {
      console.error(`❌ [Earnings] Error fetching payment intents:`, error)
    }

    // Calculate growth percentage
    const monthlyGrowth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0

    // Calculate average order value
    const avgOrderValue = totalSales > 0 ? totalEarnings / totalSales : 0

    // Determine account status
    const accountStatus = connectedAccount.charges_enabled && connectedAccount.details_submitted ? "Active" : "Pending"

    const earningsData = {
      totalEarnings,
      thisMonth,
      availableBalance,
      totalSales,
      avgOrderValue,
      monthlyGrowth,
      last30Days,
      thisMonthSales,
      last30DaysSales,
      pendingPayout,
      accountStatus,
      stripeAccountId,
      connectedAccountData: connectedAccount,
    }

    console.log(`✅ [Earnings] Data compiled successfully:`, {
      totalEarnings,
      thisMonth,
      availableBalance,
      totalSales,
      accountStatus,
    })

    return NextResponse.json(earningsData)
  } catch (error) {
    console.error("❌ [Earnings] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch earnings data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
