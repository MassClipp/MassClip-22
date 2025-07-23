import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 [Stripe Disconnect] Starting disconnect process...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ [Stripe Disconnect] Invalid or missing Bearer token")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Extract and verify token
    const token = authHeader.replace("Bearer ", "")
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Stripe Disconnect] Token verified for user:", decodedToken.uid)
    } catch (error: any) {
      console.error("❌ [Stripe Disconnect] Token verification failed:", error.message)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get user document
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.log("⚠️ [Stripe Disconnect] User document not found")
      return NextResponse.json({
        success: true,
        message: "No Stripe account was connected to disconnect",
      })
    }

    const userData = userDoc.data()

    // Check if user has any Stripe-related data
    const hasStripeData = !!(
      userData?.stripeAccountId ||
      userData?.stripeAccountStatus ||
      userData?.stripeConnected ||
      userData?.stripeOnboardingComplete
    )

    if (!hasStripeData) {
      console.log("ℹ️ [Stripe Disconnect] No Stripe account found to disconnect")
      return NextResponse.json({
        success: true,
        message: "No Stripe account was connected to disconnect",
      })
    }

    // Remove all Stripe-related fields
    const updateData: any = {
      stripeAccountId: null,
      stripeAccountStatus: "not_connected",
      stripeConnected: false,
      stripeOnboardingComplete: false,
      updatedAt: new Date(),
    }

    // Remove any other potential Stripe fields
    const fieldsToRemove = [
      "stripeAccountType",
      "stripeBusinessType",
      "stripeCapabilities",
      "stripeRequirements",
      "stripeChargesEnabled",
      "stripePayoutsEnabled",
    ]

    fieldsToRemove.forEach((field) => {
      if (userData?.[field] !== undefined) {
        updateData[field] = null
      }
    })

    await db.collection("users").doc(userId).update(updateData)

    console.log("✅ [Stripe Disconnect] Successfully disconnected Stripe account for user:", userId)

    return NextResponse.json({
      success: true,
      message: "Stripe account successfully disconnected",
    })
  } catch (error: any) {
    console.error("❌ [Stripe Disconnect] Unexpected error:", error.message)
    return NextResponse.json(
      {
        error: "Failed to disconnect Stripe account",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
