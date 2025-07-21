export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 Starting Stripe account linking process...")

    // Get authenticated user
    let user
    try {
      user = await getAuthenticatedUser(request.headers)
    } catch (authError) {
      console.error("Auth failed, trying token from body:", authError)

      const body = await request.json()
      const { idToken, stripeAccountId } = body

      if (!idToken) {
        return NextResponse.json(
          {
            success: false,
            error: "Authentication required",
          },
          { status: 401 },
        )
      }

      const { auth } = await import("@/lib/firebase-admin")
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        user = { uid: decodedToken.uid }
      } catch (tokenError) {
        console.error("Token verification failed:", tokenError)
        return NextResponse.json(
          {
            success: false,
            error: "Invalid authentication token",
          },
          { status: 401 },
        )
      }

      if (!stripeAccountId) {
        return NextResponse.json(
          {
            success: false,
            error: "Stripe account ID is required",
          },
          { status: 400 },
        )
      }

      // Simple connection - just save the account ID
      console.log(`💾 Linking account ${stripeAccountId} to user ${user.uid}`)

      try {
        // Try to get basic account info, but don't fail if we can't
        let accountInfo = {
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          accountType: "unknown",
          country: "unknown",
        }

        try {
          const account = await stripe.accounts.retrieve(stripeAccountId)
          accountInfo = {
            chargesEnabled: account.charges_enabled || false,
            payoutsEnabled: account.payouts_enabled || false,
            detailsSubmitted: account.details_submitted || false,
            accountType: account.type || "unknown",
            country: account.country || "unknown",
          }
          console.log("✅ Retrieved account info:", accountInfo)
        } catch (stripeError) {
          console.warn("⚠️ Could not retrieve account details, proceeding anyway:", stripeError.message)
        }

        // Update user profile
        await db
          .collection("users")
          .doc(user.uid)
          .update({
            stripeAccountId: stripeAccountId,
            stripeAccountStatus: {
              ...accountInfo,
              lastUpdated: new Date(),
            },
            updatedAt: new Date(),
          })

        console.log(`✅ Successfully linked Stripe account ${stripeAccountId} to user ${user.uid}`)

        return NextResponse.json({
          success: true,
          message: "Stripe account linked successfully",
          accountId: stripeAccountId,
          accountStatus: accountInfo,
        })
      } catch (error: any) {
        console.error("❌ Error updating user profile:", error)
        return NextResponse.json(
          {
            success: false,
            error: "Failed to save account information",
            details: error.message,
          },
          { status: 500 },
        )
      }
    }

    // Handle request when auth worked normally
    const body = await request.json()
    const { stripeAccountId } = body

    if (!stripeAccountId) {
      return NextResponse.json(
        {
          success: false,
          error: "Stripe account ID is required",
        },
        { status: 400 },
      )
    }

    // Simple connection - just save the account ID
    console.log(`💾 Linking account ${stripeAccountId} to user ${user.uid}`)

    try {
      // Try to get basic account info, but don't fail if we can't
      let accountInfo = {
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        accountType: "unknown",
        country: "unknown",
      }

      try {
        const account = await stripe.accounts.retrieve(stripeAccountId)
        accountInfo = {
          chargesEnabled: account.charges_enabled || false,
          payoutsEnabled: account.payouts_enabled || false,
          detailsSubmitted: account.details_submitted || false,
          accountType: account.type || "unknown",
          country: account.country || "unknown",
        }
        console.log("✅ Retrieved account info:", accountInfo)
      } catch (stripeError) {
        console.warn("⚠️ Could not retrieve account details, proceeding anyway:", stripeError.message)
      }

      // Update user profile
      await db
        .collection("users")
        .doc(user.uid)
        .update({
          stripeAccountId: stripeAccountId,
          stripeAccountStatus: {
            ...accountInfo,
            lastUpdated: new Date(),
          },
          updatedAt: new Date(),
        })

      console.log(`✅ Successfully linked Stripe account ${stripeAccountId} to user ${user.uid}`)

      return NextResponse.json({
        success: true,
        message: "Stripe account linked successfully",
        accountId: stripeAccountId,
        accountStatus: accountInfo,
      })
    } catch (error: any) {
      console.error("❌ Error updating user profile:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save account information",
          details: error.message,
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
