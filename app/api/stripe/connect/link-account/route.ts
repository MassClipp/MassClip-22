export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 Starting simplified Stripe account linking...")

    // Parse request body first
    const body = await request.json()
    const { stripeAccountId, idToken } = body

    if (!stripeAccountId) {
      return NextResponse.json(
        {
          success: false,
          error: "Stripe account ID is required",
        },
        { status: 400 },
      )
    }

    console.log(`🔗 Attempting to link account: ${stripeAccountId}`)

    // Get authenticated user
    let user
    try {
      user = await getAuthenticatedUser(request.headers)
      console.log(`✅ Auth successful via headers for user: ${user.uid}`)
    } catch (authError) {
      console.log("⚠️ Header auth failed, trying token from body...")

      if (!idToken) {
        return NextResponse.json(
          {
            success: false,
            error: "Authentication required - no token provided",
          },
          { status: 401 },
        )
      }

      try {
        const { auth } = await import("@/lib/firebase-admin")
        const decodedToken = await auth.verifyIdToken(idToken)
        user = { uid: decodedToken.uid }
        console.log(`✅ Auth successful via token for user: ${user.uid}`)
      } catch (tokenError) {
        console.error("❌ Token verification failed:", tokenError)
        return NextResponse.json(
          {
            success: false,
            error: "Invalid authentication token",
          },
          { status: 401 },
        )
      }
    }

    // Simple account linking - just save it
    console.log(`💾 Linking account ${stripeAccountId} to user ${user.uid}`)

    // Try to get account info but don't fail if we can't
    let accountInfo = {
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      accountType: "express",
      country: "US",
      lastUpdated: new Date(),
    }

    try {
      console.log(`🔍 Attempting to retrieve Stripe account details...`)
      const account = await stripe.accounts.retrieve(stripeAccountId)

      accountInfo = {
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        detailsSubmitted: account.details_submitted || false,
        accountType: account.type || "express",
        country: account.country || "US",
        lastUpdated: new Date(),
      }

      console.log(`✅ Retrieved account details:`, accountInfo)
    } catch (stripeError: any) {
      console.warn(`⚠️ Could not retrieve account details (continuing anyway):`, stripeError.message)
      // Continue with default values
    }

    try {
      // Update user profile in Firestore
      await db.collection("users").doc(user.uid).update({
        stripeAccountId: stripeAccountId,
        stripeAccountStatus: accountInfo,
        stripeConnectedAt: new Date(),
        updatedAt: new Date(),
      })

      console.log(`✅ Successfully linked Stripe account ${stripeAccountId} to user ${user.uid}`)

      return NextResponse.json({
        success: true,
        message: "Stripe account linked successfully",
        accountId: stripeAccountId,
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
    console.error("❌ Unexpected error in link-account:", error)
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
