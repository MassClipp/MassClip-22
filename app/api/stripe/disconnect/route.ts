export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔌 Starting Stripe account disconnect process...")

    // Get authenticated user
    const user = await getAuthenticatedUser(request.headers)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 },
      )
    }

    console.log(`🗑️ Disconnecting Stripe account for user ${user.uid}`)

    try {
      // Get current user data
      const userDoc = await db.collection("users").doc(user.uid).get()
      const userData = userDoc.data()

      if (!userData?.stripeAccountId) {
        return NextResponse.json(
          {
            success: false,
            error: "No Stripe account connected",
          },
          { status: 400 },
        )
      }

      const stripeAccountId = userData.stripeAccountId

      // Remove Stripe data from user profile
      await db.collection("users").doc(user.uid).update({
        stripeAccountId: null,
        stripeAccountStatus: null,
        updatedAt: new Date(),
      })

      console.log(`✅ Successfully disconnected Stripe account ${stripeAccountId} from user ${user.uid}`)

      return NextResponse.json({
        success: true,
        message: "Stripe account disconnected successfully",
        disconnectedAccountId: stripeAccountId,
      })
    } catch (error: any) {
      console.error("❌ Error disconnecting Stripe account:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to disconnect Stripe account",
          details: error.message,
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
