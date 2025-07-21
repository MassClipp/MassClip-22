export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Checking Stripe connection status...")

    // Get authenticated user
    let user
    try {
      user = await getAuthenticatedUser(request.headers)
    } catch (authError) {
      console.error("Auth failed:", authError)
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          connected: false,
        },
        { status: 401 },
      )
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
          connected: false,
        },
        { status: 401 },
      )
    }

    console.log(`🔍 Checking connection status for user: ${user.uid}`)

    try {
      // Get user document from Firestore
      const userDoc = await db.collection("users").doc(user.uid).get()

      if (!userDoc.exists) {
        console.log(`❌ User document not found: ${user.uid}`)
        return NextResponse.json({
          success: true,
          connected: false,
          message: "User profile not found",
        })
      }

      const userData = userDoc.data()
      const stripeAccountId = userData?.stripeAccountId
      const stripeAccountStatus = userData?.stripeAccountStatus

      if (!stripeAccountId) {
        console.log(`ℹ️ No Stripe account connected for user: ${user.uid}`)
        return NextResponse.json({
          success: true,
          connected: false,
          message: "No Stripe account connected",
        })
      }

      console.log(`✅ Stripe account found: ${stripeAccountId}`)

      return NextResponse.json({
        success: true,
        connected: true,
        accountId: stripeAccountId,
        accountStatus: stripeAccountStatus || {
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          accountType: "unknown",
          country: "unknown",
        },
        message: "Stripe account connected",
      })
    } catch (dbError: any) {
      console.error("❌ Database error:", dbError)
      return NextResponse.json(
        {
          success: false,
          error: "Database error",
          connected: false,
          details: dbError.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ Unexpected error checking connection status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        connected: false,
        details: error.message,
      },
      { status: 500 },
    )
  }
}
