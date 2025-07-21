import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Stripe Connect Status] Starting request...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    console.log("🔑 [Stripe Connect Status] Auth header present:", !!authHeader)

    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ [Stripe Connect Status] Invalid or missing Bearer token")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Extract token
    const token = authHeader.replace("Bearer ", "")
    console.log("🎫 [Stripe Connect Status] Token extracted, length:", token.length)

    // Verify Firebase token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Stripe Connect Status] Token verified for user:", decodedToken.uid)
    } catch (error: any) {
      console.error("❌ [Stripe Connect Status] Token verification failed:", error.message)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get user document from Firestore
    try {
      const userDoc = await db.collection("users").doc(userId).get()

      if (!userDoc.exists) {
        console.log("⚠️ [Stripe Connect Status] User document not found, creating...")
        await db.collection("users").doc(userId).set({
          uid: userId,
          email: decodedToken.email,
          createdAt: new Date(),
          stripeAccountStatus: "not_connected",
        })

        return NextResponse.json({
          isConnected: false,
          status: "not_connected",
          requiresAction: false,
        })
      }

      const userData = userDoc.data()
      const stripeAccountId = userData?.stripeAccountId
      const stripeAccountStatus = userData?.stripeAccountStatus || "not_connected"

      console.log("📊 [Stripe Connect Status] User data:", {
        hasStripeAccount: !!stripeAccountId,
        status: stripeAccountStatus,
      })

      return NextResponse.json({
        isConnected: !!stripeAccountId,
        accountId: stripeAccountId,
        status: stripeAccountStatus,
        requiresAction: stripeAccountStatus === "pending" || stripeAccountStatus === "restricted",
      })
    } catch (firestoreError: any) {
      console.error("❌ [Stripe Connect Status] Firestore error:", firestoreError.message)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("❌ [Stripe Connect Status] Unexpected error:", error.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
