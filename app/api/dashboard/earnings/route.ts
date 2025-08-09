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

// Helper function to safely convert Firestore timestamp to Date
function safeTimestampToDate(timestamp: any): Date {
  try {
    if (!timestamp) return new Date()

    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp
    }

    // If it's a Firestore Timestamp with toDate method
    if (timestamp && typeof timestamp.toDate === "function") {
      return timestamp.toDate()
    }

    // If it's a timestamp object with seconds
    if (timestamp && typeof timestamp.seconds === "number") {
      return new Date(timestamp.seconds * 1000)
    }

    // If it's a string, try to parse it
    if (typeof timestamp === "string") {
      const parsed = new Date(timestamp)
      return isNaN(parsed.getTime()) ? new Date() : parsed
    }

    // If it's a number (unix timestamp)
    if (typeof timestamp === "number") {
      return new Date(timestamp * 1000)
    }

    // Fallback to current date
    return new Date()
  } catch (error) {
    console.warn("Error converting timestamp:", error)
    return new Date()
  }
}

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

    const stripeAccountId = connectedAccount.stripe_user_id

    // Get date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get earnings data from bundlePurchases collection (includes platform fee breakdown)
    console.log(`📊 [Earnings] Fetching purchase data from bundlePurchases collection...`)

    const allPurchasesQuery = await db
      .collection("bundlePurchases")
      .where("creatorId", "==", userId)
      .where("status", "==", "completed")
      .get()

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

    allPurchasesQuery.forEach((doc) => {
      try {
        const purchase = doc.data()

        // Safely convert timestamp to Date
        const purchaseDate = safeTimestampToDate(purchase.timestamp)

        // Use creator earnings (after platform fees) for earnings calculations
        const creatorEarnings = Number(purchase.creatorEarningsDollars || purchase.creatorEarningsCents / 100 || 0)
        const grossAmount = Number(purchase.purchaseAmountDollars || purchase.purchaseAmount / 100 || 0)
        const platformFee = Number(purchase.platformFeeDollars || purchase.platformFeeCents / 100 || 0)

        // Validate numbers
        if (isNaN(creatorEarnings) || isNaN(grossAmount) || isNaN(platformFee)) {
          console.warn(`[Earnings] Invalid numbers in purchase ${doc.id}:`, {
            creatorEarnings,
            grossAmount,
            platformFee,
          })
          return // Skip this purchase
        }

        // Add to totals
        totalEarnings += creatorEarnings
        grossSales += grossAmount
        totalPlatformFees += platformFee
        totalSales += 1

        // This month
        if (purchaseDate >= startOfMonth) {
          thisMonth += creatorEarnings
          thisMonthGross += grossAmount
          thisMonthPlatformFees += platformFee
          thisMonthSales += 1
        }

        // Last month
        if (purchaseDate >= startOfLastMonth && purchaseDate <= endOfLastMonth) {
          lastMonth += creatorEarnings
          lastMonthGross += grossAmount
        }

        // Last 30 days
        if (purchaseDate >= thirtyDaysAgo) {
          last30Days += creatorEarnings
          last30DaysGross += grossAmount
          last30DaysPlatformFees += platformFee
          last30DaysSales += 1
        }
      } catch (error) {
        console.error(`[Earnings] Error processing purchase ${doc.id}:`, error)
        // Continue processing other purchases
      }
    })

    console.log(`💰 [Earnings] Purchase data summary:`, {
      totalPurchases: allPurchasesQuery.size,
      totalEarnings: totalEarnings.toFixed(2),
      grossSales: grossSales.toFixed(2),
      totalPlatformFees: totalPlatformFees.toFixed(2),
      thisMonthEarnings: thisMonth.toFixed(2),
      thisMonthGross: thisMonthGross.toFixed(2),
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
    const availableBalance = balance.available?.reduce((sum, bal) => sum + (bal.amount || 0), 0) / 100 || 0
    const pendingPayout = balance.pending?.reduce((sum, bal) => sum + (bal.amount || 0), 0) / 100 || 0

    // Calculate growth percentage (based on net earnings)
    const monthlyGrowth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0

    // Calculate average order value (based on gross sales)
    const avgOrderValue = totalSales > 0 ? grossSales / totalSales : 0

    // Determine account status
    const accountStatus = connectedAccount.charges_enabled && connectedAccount.details_submitted ? "Active" : "Pending"

    const earningsData = {
      // Net earnings (after platform fees)
      totalEarnings: Number(totalEarnings.toFixed(2)),
      thisMonth: Number(thisMonth.toFixed(2)),
      last30Days: Number(last30Days.toFixed(2)),

      // Gross sales (before platform fees)
      grossSales: Number(grossSales.toFixed(2)),
      thisMonthGross: Number(thisMonthGross.toFixed(2)),
      last30DaysGross: Number(last30DaysGross.toFixed(2)),

      // Platform fees
      totalPlatformFees: Number(totalPlatformFees.toFixed(2)),
      thisMonthPlatformFees: Number(thisMonthPlatformFees.toFixed(2)),
      last30DaysPlatformFees: Number(last30DaysPlatformFees.toFixed(2)),

      // Stripe balance
      availableBalance: Number(availableBalance.toFixed(2)),
      pendingPayout: Number(pendingPayout.toFixed(2)),

      // Sales metrics
      totalSales,
      thisMonthSales,
      last30DaysSales,
      avgOrderValue: Number(avgOrderValue.toFixed(2)),
      monthlyGrowth: Number(monthlyGrowth.toFixed(2)),

      // Account info
      accountStatus,
      stripeAccountId,
      connectedAccountData: connectedAccount,
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
    return NextResponse.json(
      {
        error: "Failed to fetch earnings data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
