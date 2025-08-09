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

// Helper function to get connected Stripe account
async function getConnectedStripeAccount(userId: string) {
  try {
    const connectedAccountDoc = await db.collection("connectedStripeAccounts").doc(userId).get()
    if (connectedAccountDoc.exists) {
      const accountData = connectedAccountDoc.data()
      return accountData
    }
    return null
  } catch (error) {
    console.error(`❌ [Stats] Error fetching connected account:`, error)
    return null
  }
}

// Helper function to fetch Stripe earnings data
async function getStripeEarnings(stripeAccountId: string) {
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Fetch charges from last 30 days
    const charges = await stripe.charges.list(
      {
        created: {
          gte: Math.floor(thirtyDaysAgo.getTime() / 1000),
        },
        limit: 100,
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    // Calculate earnings (net amounts after fees)
    const successfulCharges = charges.data.filter((charge) => charge.status === "succeeded")
    const totalEarnings =
      successfulCharges.reduce((total, charge) => {
        const netAmount = charge.amount - (charge.application_fee_amount || 0)
        return total + netAmount
      }, 0) / 100 // Convert from cents to dollars

    const salesCount = successfulCharges.length

    return {
      totalEarnings,
      salesCount,
      hasData: true,
    }
  } catch (error) {
    console.error(`❌ [Stats] Error fetching Stripe earnings:`, error)
    return {
      totalEarnings: 0,
      salesCount: 0,
      hasData: false,
    }
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

    console.log(`📊 [Stats] Fetching dashboard statistics for user: ${userId}`)

    // Get connected Stripe account
    const connectedAccount = await getConnectedStripeAccount(userId)

    let salesData = {
      totalEarnings: 0,
      salesCount: 0,
      hasStripeData: false,
    }

    // If user has connected Stripe account, fetch real data
    if (connectedAccount?.stripe_user_id && connectedAccount.charges_enabled) {
      console.log(`💳 [Stats] Fetching Stripe data for account: ${connectedAccount.stripe_user_id}`)
      const stripeEarnings = await getStripeEarnings(connectedAccount.stripe_user_id)
      salesData = {
        totalEarnings: stripeEarnings.totalEarnings,
        salesCount: stripeEarnings.salesCount,
        hasStripeData: stripeEarnings.hasData,
      }
    } else {
      console.log(`⚠️ [Stats] No connected Stripe account or not enabled for user: ${userId}`)
    }

    // Get content statistics from Firestore
    const uploadsQuery = await db.collection("uploads").where("userId", "==", userId).get()

    let totalUploads = 0
    let freeVideos = 0
    let premiumVideos = 0

    uploadsQuery.forEach((doc) => {
      const upload = doc.data()
      totalUploads++

      if (upload.isFree === true) {
        freeVideos++
      } else {
        premiumVideos++
      }
    })

    // Get profile views
    const profileDoc = await db.collection("profiles").doc(userId).get()
    const profileData = profileDoc.exists ? profileDoc.data() : {}
    const profileViews = profileData?.totalViews || 0

    const statistics = {
      // Sales data from Stripe
      totalEarnings: salesData.totalEarnings,
      salesCount: salesData.salesCount,
      hasStripeConnection: !!connectedAccount?.stripe_user_id,
      stripeAccountEnabled: connectedAccount?.charges_enabled || false,

      // Content statistics
      totalUploads,
      freeVideos,
      premiumVideos,
      freeRatio: totalUploads > 0 ? (freeVideos / totalUploads) * 100 : 0,

      // Profile statistics
      profileViews,

      // Debug info
      debug: {
        hasStripeData: salesData.hasStripeData,
        stripeAccountId: connectedAccount?.stripe_user_id || null,
        accountStatus: connectedAccount?.charges_enabled ? "enabled" : "disabled",
      },
    }

    console.log(`✅ [Stats] Statistics compiled:`, {
      totalEarnings: statistics.totalEarnings,
      salesCount: statistics.salesCount,
      hasStripeConnection: statistics.hasStripeConnection,
      totalUploads: statistics.totalUploads,
      freeVideos: statistics.freeVideos,
      premiumVideos: statistics.premiumVideos,
    })

    return NextResponse.json(statistics)
  } catch (error) {
    console.error("❌ [Stats] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
