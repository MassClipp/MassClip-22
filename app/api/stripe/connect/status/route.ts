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

    // Get user's Stripe account info from Firestore
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "not_connected",
      })
    }

    // Get latest status from Stripe
    const account = await stripe.accounts.retrieve(userData.stripeAccountId)

    // Update local status
    const updateData = {
      stripeAccountStatus: account.details_submitted ? "active" : "pending",
      stripeChargesEnabled: account.charges_enabled,
      stripePayoutsEnabled: account.payouts_enabled,
      stripeDetailsSubmitted: account.details_submitted,
      updatedAt: new Date(),
    }

    await adminDb.collection("users").doc(userId).update(updateData)

    return NextResponse.json({
      connected: true,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      status: account.details_submitted ? "active" : "pending",
    })
  } catch (error) {
    console.error("Error checking Stripe status:", error)
    return NextResponse.json({ error: "Failed to check Stripe status" }, { status: 500 })
  }
}
