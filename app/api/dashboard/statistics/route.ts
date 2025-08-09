import { type NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import Stripe from "stripe"

// Initialize Firebase Admin if it hasn't been initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const { getAuth } = await import("firebase-admin/auth")
    const auth = getAuth()

    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`[Statistics API] Fetching stats for userId: ${userId}`)

    // Get user profile to find Stripe account
    const userProfileRef = db.collection("userProfiles").doc(userId)
    const userProfileDoc = await userProfileRef.get()

    if (!userProfileDoc.exists) {
      console.log(`[Statistics API] No user profile found for ${userId}`)
      return NextResponse.json({
        totalEarnings: 0,
        salesCount: 0,
        totalUploads: 0,
        freeUploads: 0,
        premiumUploads: 0,
        profileViews: 0,
        lastViewDate: null,
      })
    }

    const userProfile = userProfileDoc.data()
    const stripeAccountId = userProfile?.stripeAccountId

    console.log(`[Statistics API] User profile found, Stripe account: ${stripeAccountId}`)

    // Calculate 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000)

    let totalEarnings = 0
    let salesCount = 0

    // Fetch earnings from Stripe if user has connected account
    if (stripeAccountId) {
      try {
        console.log(`[Statistics API] Fetching charges from Stripe for account: ${stripeAccountId}`)

        const charges = await stripe.charges.list(
          {
            created: { gte: thirtyDaysAgoTimestamp },
            limit: 100,
          },
          {
            stripeAccount: stripeAccountId,
          },
        )

        console.log(`[Statistics API] Found ${charges.data.length} charges from Stripe`)

        for (const charge of charges.data) {
          if (charge.status === "succeeded") {
            const grossAmount = charge.amount / 100 // Convert from cents to dollars
            const applicationFee = charge.application_fee_amount ? charge.application_fee_amount / 100 : 0
            const stripeFee = charge.balance_transaction
              ? (
                  await stripe.balanceTransactions.retrieve(charge.balance_transaction, {
                    stripeAccount: stripeAccountId,
                  })
                ).fee / 100
              : 0

            const netAmount = grossAmount - applicationFee - stripeFee

            console.log(
              `[Statistics API] Charge ${charge.id}: Gross: $${grossAmount}, App Fee: $${applicationFee}, Stripe Fee: $${stripeFee}, Net: $${netAmount}`,
            )

            totalEarnings += netAmount
            salesCount++
          }
        }

        console.log(`[Statistics API] Total earnings from Stripe: $${totalEarnings}, Sales count: ${salesCount}`)
      } catch (stripeError) {
        console.error(`[Statistics API] Stripe API error:`, stripeError)
        // Continue with other stats even if Stripe fails
      }
    } else {
      console.log(`[Statistics API] No Stripe account connected for user ${userId}`)
    }

    // Get upload statistics
    const uploadsRef = db.collection("uploads").where("userId", "==", userId)
    const uploadsSnapshot = await uploadsRef.get()

    const totalUploads = uploadsSnapshot.size
    let freeUploads = 0
    let premiumUploads = 0

    uploadsSnapshot.forEach((doc) => {
      const upload = doc.data()
      if (upload.isFree) {
        freeUploads++
      } else {
        premiumUploads++
      }
    })

    // Get profile view statistics
    const profileViews = userProfile?.profileViews || 0
    const lastViewDate = userProfile?.lastProfileView || null

    console.log(
      `[Statistics API] Final stats - Earnings: $${totalEarnings}, Sales: ${salesCount}, Uploads: ${totalUploads}`,
    )

    return NextResponse.json({
      totalEarnings: Math.max(0, totalEarnings),
      salesCount: Math.max(0, salesCount),
      totalUploads,
      freeUploads,
      premiumUploads,
      profileViews,
      lastViewDate,
    })
  } catch (error) {
    console.error("[Statistics API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
