import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Connection Status] Starting request...")

    // First test the auth endpoint
    const testAuthResponse = await fetch(`${request.nextUrl.origin}/api/test-auth`, {
      headers: {
        authorization: request.headers.get("authorization") || "",
      },
    })

    console.log("🧪 [Connection Status] Test auth response:", testAuthResponse.status)

    if (!testAuthResponse.ok) {
      const testError = await testAuthResponse.json()
      console.error("❌ [Connection Status] Test auth failed:", testError)
      return NextResponse.json(
        {
          error: "Authentication test failed",
          details: testError,
        },
        { status: 401 },
      )
    }

    const testResult = await testAuthResponse.json()
    console.log("✅ [Connection Status] Test auth passed:", testResult.user)

    const userId = testResult.user.uid

    // Get user document from Firestore
    try {
      const userDoc = await db.collection("users").doc(userId).get()

      if (!userDoc.exists) {
        console.log("⚠️ [Connection Status] User document not found, creating...")
        await db.collection("users").doc(userId).set({
          uid: userId,
          email: testResult.user.email,
          createdAt: new Date(),
          stripeAccountStatus: "not_connected",
        })

        return NextResponse.json({
          connected: false,
          status: "not_connected",
          requiresAction: false,
        })
      }

      const userData = userDoc.data()
      const stripeAccountId = userData?.stripeAccountId
      const stripeAccountStatus = userData?.stripeAccountStatus || "not_connected"

      console.log("📊 [Connection Status] User data:", {
        hasStripeAccount: !!stripeAccountId,
        status: stripeAccountStatus,
      })

      return NextResponse.json({
        connected: !!stripeAccountId,
        accountId: stripeAccountId,
        status: stripeAccountStatus,
        requiresAction: stripeAccountStatus === "pending" || stripeAccountStatus === "restricted",
      })
    } catch (firestoreError) {
      console.error("❌ [Connection Status] Firestore error:", firestoreError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ [Connection Status] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
