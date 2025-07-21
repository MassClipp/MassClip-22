import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Connection Status] Starting authentication check...")

    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Connection Status] No valid authorization header")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    console.log("🔑 [Connection Status] Token received, verifying...")

    // Verify the Firebase ID token - fix the function call
    const decodedToken = await verifyIdToken(token)
    if (!decodedToken) {
      console.log("❌ [Connection Status] Token verification failed")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("✅ [Connection Status] User authenticated:", userId)

    // Get user's Stripe connection status from Firestore
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.log("❌ [Connection Status] User document not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId
    const stripeAccountStatus = userData?.stripeAccountStatus || "not_connected"

    console.log("📊 [Connection Status] User Stripe data:", {
      stripeAccountId: stripeAccountId ? "present" : "missing",
      stripeAccountStatus,
    })

    return NextResponse.json({
      connected: !!stripeAccountId,
      accountId: stripeAccountId,
      status: stripeAccountStatus,
      requiresAction: stripeAccountStatus === "pending" || stripeAccountStatus === "restricted",
    })
  } catch (error) {
    console.error("❌ [Connection Status] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request) // Handle POST the same way as GET for this endpoint
}
