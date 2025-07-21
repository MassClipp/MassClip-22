import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    console.log("📊 [Stripe Status] Starting status check...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    console.log("🔑 [Stripe Status] Auth header present:", !!authHeader)

    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ [Stripe Status] Invalid or missing Bearer token")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Extract and verify token
    const token = authHeader.replace("Bearer ", "")
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Stripe Status] Token verified for user:", decodedToken.uid)
    } catch (error: any) {
      console.error("❌ [Stripe Status] Token verification failed:", error.message)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get user document from Firestore
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.log("❌ [Stripe Status] User document not found")
      return NextResponse.json({
        isConnected: false,
        error: "User profile not found",
      })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      console.log("📊 [Stripe Status] No Stripe account ID found")
      return NextResponse.json({
        isConnected: false,
        accountId: null,
        status: "not_connected",
      })
    }

    // Verify account with Stripe
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId)
      console.log("✅ [Stripe Status] Stripe account verified:", account.id)

      const isConnected = account.details_submitted && account.charges_enabled

      return NextResponse.json({
        isConnected,
        accountId: stripeAccountId,
        status: isConnected ? "active" : "pending",
        details: {
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          country: account.country,
          type: account.type,
        },
      })
    } catch (stripeError: any) {
      console.error("❌ [Stripe Status] Stripe error:", stripeError.message)

      // If account doesn't exist, clear it from user document
      if (stripeError.code === "resource_missing") {
        await db.collection("users").doc(userId).update({
          stripeAccountId: null,
          stripeAccountStatus: null,
        })
      }

      return NextResponse.json({
        isConnected: false,
        accountId: null,
        status: "error",
        error: stripeError.message,
      })
    }
  } catch (error: any) {
    console.error("❌ [Stripe Status] Unexpected error:", error.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
