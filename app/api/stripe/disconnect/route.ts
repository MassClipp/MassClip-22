export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔌 Starting Stripe account disconnect process...")

    // Get authenticated user
    const user = await getAuthenticatedUser(request.headers)

    if (!user) {
      console.log("❌ No authenticated user found")
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 },
      )
    }

    console.log(`🗑️ Attempting to disconnect Stripe account for user ${user.uid}`)

    try {
      // Get current user data
      const userDoc = await db.collection("users").doc(user.uid).get()

      if (!userDoc.exists) {
        console.log(`❌ User document not found for ${user.uid}`)
        return NextResponse.json(
          {
            success: false,
            error: "User profile not found",
          },
          { status: 404 },
        )
      }

      const userData = userDoc.data()
      console.log(`📊 User data retrieved:`, {
        hasStripeAccountId: !!userData?.stripeAccountId,
        stripeAccountStatus: userData?.stripeAccountStatus,
        stripeAccountId: userData?.stripeAccountId ? `${userData.stripeAccountId.substring(0, 10)}...` : "none",
      })

      // Check if user has any Stripe-related data to disconnect
      const hasStripeData =
        userData?.stripeAccountId ||
        userData?.stripeAccountStatus ||
        userData?.stripeConnected ||
        userData?.stripeOnboardingComplete

      if (!hasStripeData) {
        console.log(`ℹ️ No Stripe account data found for user ${user.uid}`)
        return NextResponse.json(
          {
            success: true,
            message: "No Stripe account was connected to disconnect",
            wasConnected: false,
          },
          { status: 200 },
        )
      }

      const stripeAccountId = userData.stripeAccountId

      // Remove all Stripe-related data from user profile
      const updateData: any = {
        stripeAccountId: null,
        stripeAccountStatus: null,
        stripeConnected: false,
        stripeOnboardingComplete: false,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        updatedAt: new Date(),
      }

      await db.collection("users").doc(user.uid).update(updateData)

      console.log(`✅ Successfully disconnected Stripe account ${stripeAccountId || "unknown"} from user ${user.uid}`)

      return NextResponse.json({
        success: true,
        message: "Stripe account disconnected successfully",
        disconnectedAccountId: stripeAccountId,
        wasConnected: true,
      })
    } catch (firestoreError: any) {
      console.error("❌ Firestore error during disconnect:", firestoreError)
      return NextResponse.json(
        {
          success: false,
          error: "Database error during disconnect",
          details: firestoreError.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ Unexpected error in disconnect:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
