export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 Linking Stripe account...")

    // Verify authentication
    const decodedToken = await verifyIdToken(request)

    if (!decodedToken) {
      console.log("❌ No valid authentication found")
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 },
      )
    }

    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: "Account ID is required",
        },
        { status: 400 },
      )
    }

    console.log(`🔗 Linking account ${accountId} to user ${decodedToken.uid}`)

    try {
      // Create account info (for demo purposes)
      const accountInfo = {
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        accountType: "express",
        country: "US",
        lastUpdated: new Date(),
      }

      // Update user document with Stripe account info
      await db.collection("users").doc(decodedToken.uid).set(
        {
          stripeAccountId: accountId,
          stripeAccountStatus: accountInfo,
          stripeConnectedAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true },
      )

      console.log(`✅ Successfully linked Stripe account ${accountId}`)

      return NextResponse.json({
        success: true,
        message: "Stripe account linked successfully",
        accountId,
        accountStatus: accountInfo,
      })
    } catch (dbError: any) {
      console.error("❌ Database error:", dbError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save account information",
          details: dbError.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ Unexpected error linking account:", error)
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
