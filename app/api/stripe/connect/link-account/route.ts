export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"
import { error } from "console"

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

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
          error: "Authentication required - please log in first",
        },
        { status: 401 },
      )
    }

    const { accountId } = await request.json()

    if (!accountId || typeof accountId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Valid Account ID is required",
        },
        { status: 400 },
      )
    }

    // Clean the account ID (remove any whitespace)
    const cleanAccountId = accountId.trim()

    console.log(`🔗 Linking account ${cleanAccountId} to user ${decodedToken.uid}`)

    try {
      // Step 1: Verify the account exists and get its details from Stripe
      console.log("🔍 Verifying Stripe account with Stripe API...")
      const account = await stripe.accounts.retrieve(cleanAccountId)

      if (!account) {
        return NextResponse.json(
          {
            success: false,
            error: "Stripe account not found. Please check your Account ID.",
          },
          { status: 404 },
        )
      }

      console.log(`✅ Account verified: ${account.id}`)
      console.log(`📊 Account status: charges=${account.charges_enabled}, payouts=${account.payouts_enabled}`)

      // Step 2: Create account info from Stripe response
      const accountInfo = {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        accountType: account.type || "standard",
        country: account.country || "US",
        email: account.email || null,
        businessType: account.business_type || null,
        lastUpdated: new Date(),
        stripeData: {
          created: account.created,
          defaultCurrency: account.default_currency,
          businessProfile: account.business_profile,
        },
      }

      // Step 3: Update user document with Stripe account info
      console.log(`💾 Saving account info to Firestore for user: ${decodedToken.uid}`)
      await db.collection("users").doc(decodedToken.uid).set(
        {
          stripeAccountId: cleanAccountId,
          stripeAccountStatus: accountInfo,
          stripeConnectedAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true },
      )

      console.log(`✅ Successfully linked and saved Stripe account ${cleanAccountId}`)

      return NextResponse.json({
        success: true,
        message: "Stripe account linked successfully! You can now start receiving payments.",
        accountId: cleanAccountId,
        accountStatus: accountInfo,
      })
    } catch (stripeError: any) {
      console.error("❌ Stripe API error:", stripeError)

      if (stripeError.code === "resource_missing") {
        return NextResponse.json(
          {
            success: false,
            error: "Stripe account not found. Please check your Account ID and try again.",
          },
          { status: 404 },
        )
      } else if (stripeError.code === "invalid_request_error") {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid Account ID format. Please ensure you're using the correct Stripe Account ID.",
          },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to verify account with Stripe. Please try again.",
          details: stripeError.message,
        },
        { status: 500 },
      )
    }
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
    \
  }
  catch (error: any)
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
