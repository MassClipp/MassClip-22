import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Get user data from Firestore
    const userDoc = await adminDb.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "not_connected",
      })
    }

    const userData = userDoc.data()!
    const accountId = userData.stripeAccountId

    if (!accountId) {
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "not_connected",
      })
    }

    // Get fresh account data from Stripe
    try {
      const account = await stripe.accounts.retrieve(accountId)

      // Update our local data with fresh info from Stripe
      await adminDb
        .collection("users")
        .doc(userId)
        .update({
          stripeChargesEnabled: account.charges_enabled,
          stripePayoutsEnabled: account.payouts_enabled,
          stripeDetailsSubmitted: account.details_submitted,
          stripeAccountStatus: account.details_submitted ? "active" : "pending",
          updatedAt: new Date(),
        })

      return NextResponse.json({
        connected: true,
        accountId,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        status: account.details_submitted ? "active" : "pending",
      })
    } catch (stripeError: any) {
      // If account doesn't exist in Stripe, clean up our records
      if (stripeError.code === "account_invalid") {
        await adminDb.collection("users").doc(userId).update({
          stripeAccountId: null,
          stripeAccountStatus: null,
          stripeChargesEnabled: false,
          stripePayoutsEnabled: false,
          stripeDetailsSubmitted: false,
          updatedAt: new Date(),
        })

        return NextResponse.json({
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          status: "not_connected",
        })
      }

      throw stripeError
    }
  } catch (error) {
    console.error("Error checking Stripe status:", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}
