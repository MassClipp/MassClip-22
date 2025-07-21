export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 Linking Stripe account...")

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
        },
        { status: 401 },
      )
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
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

    console.log(`🔗 Linking account ${accountId} to user ${user.uid}`)

    try {
      // Verify the account exists in Stripe
      const account = await stripe.accounts.retrieve(accountId)

      if (!account) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid Stripe account ID",
          },
          { status: 400 },
        )
      }

      // Update user document with Stripe account info
      await db
        .collection("users")
        .doc(user.uid)
        .update({
          stripeAccountId: accountId,
          stripeAccountStatus: {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
            accountType: account.type,
            country: account.country,
          },
          stripeConnectedAt: new Date(),
        })

      console.log(`✅ Successfully linked Stripe account ${accountId}`)

      return NextResponse.json({
        success: true,
        message: "Stripe account linked successfully",
        accountId,
        accountStatus: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          accountType: account.type,
          country: account.country,
        },
      })
    } catch (stripeError: any) {
      console.error("❌ Stripe error:", stripeError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to verify Stripe account",
          details: stripeError.message,
        },
        { status: 400 },
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
