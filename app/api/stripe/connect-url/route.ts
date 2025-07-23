import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { db } from "@/lib/firebase-admin"
import { isTestMode } from "@/lib/stripe"

interface ConnectUrlRequest {
  idToken: string
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as ConnectUrlRequest

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Connect URL] Invalid ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`🔗 [Connect URL] Creating connect URL for user: ${userId}`)

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const accountId = userData?.[accountIdField]

    if (!accountId) {
      return NextResponse.json({ error: "No Stripe account found. Please create an account first." }, { status: 404 })
    }

    try {
      // Create Stripe Connect OAuth URL with correct redirect URI
      const state = `user_${userId}_${Date.now()}`
      const connectUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.STRIPE_CLIENT_ID}&scope=read_write&redirect_uri=https://massclip.pro/api/stripe/connect/oauth-callback&state=${state}`

      console.log(`✅ [Connect URL] Created connect URL for account ${accountId}`)

      return NextResponse.json({
        success: true,
        connectUrl,
        accountId,
      })
    } catch (stripeError: any) {
      console.error("❌ [Connect URL] Error creating connect URL:", stripeError)
      return NextResponse.json({ error: "Failed to create connect URL", details: stripeError.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error("❌ [Connect URL] Unexpected error:", error)
    return NextResponse.json({ error: "Failed to create connect URL", details: error.message }, { status: 500 })
  }
}
