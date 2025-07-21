export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

// Initialize Stripe
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

    if (!accountId || !accountId.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Account ID is required",
        },
        { status: 400 },
      )
    }

    const cleanAccountId = accountId.trim()
    console.log(`🔗 Linking account ${cleanAccountId} to user ${decodedToken.uid}`)

    try {
      // Step 1: Verify the Stripe account exists and get its details
      console.log("🔍 Verifying Stripe account exists...")
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

      console.log(`✅ Stripe account verified: ${account.id}`)
      console.log(`Account type: ${account.type}`)
      console.log(`Charges enabled: ${account.charges_enabled}`)
      console.log(`Payouts enabled: ${account.payouts_enabled}`)

      // Step 2: Create account info from Stripe response
      const accountInfo = {
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        detailsSubmitted: account.details_submitted || false,
        accountType: account.type || "unknown",
        country: account.country || "unknown",
        email: account.email || null,
        businessType: account.business_type || null,
        lastUpdated: new Date(),
      }

      // Step 3: Check if this account is already connected to another user
      const existingConnection = await db.collection("users").where("stripeAccountId", "==", cleanAccountId).get()

      if (!existingConnection.empty) {
        const existingDoc = existingConnection.docs[0]
        if (existingDoc.id !== decodedToken.uid) {
          return NextResponse.json(
            {
              success: false,
              error: "This Stripe account is already connected to another MassClip user.",
            },
            { status: 409 },
          )
        }
      }

      // Step 4: Update user document with Stripe account info
      await db.collection("users").doc(decodedToken.uid).set(
        {
          stripeAccountId: cleanAccountId,
          stripeAccountStatus: accountInfo,
          stripeConnectedAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true },
      )

      console.log(`✅ Successfully linked Stripe account ${cleanAccountId} to user ${decodedToken.uid}`)

      // Step 5: Log the connection for audit purposes
      await db.collection("stripe_connections").add({
        userId: decodedToken.uid,
        stripeAccountId: cleanAccountId,
        connectedAt: new Date(),
        accountInfo: accountInfo,
      })

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
      }

      if (stripeError.code === "invalid_request_error") {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid Account ID format. Please check your Account ID and try again.",
          },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to verify Stripe account. Please try again.",
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
  }
  catch (err)
  \
    console.error("❌ Unexpected error linking account:", err)
  return NextResponse.json(
    {
      success: false,
      error: "Internal server error",
      details: err.message,
    },
    { status: 500 },
  )
}
