import { type NextRequest, NextResponse } from "next/server"
import { saveConnectedStripeAccount } from "@/lib/stripe-accounts-service"
import { adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { userId, stripeAccountId } = await request.json()

    if (!userId || !stripeAccountId) {
      return NextResponse.json(
        { error: "Missing userId or stripeAccountId" },
        { status: 400 }
      )
    }

    console.log(`🔄 Saving Stripe account ${stripeAccountId} for user ${userId}`)

    // Get the Stripe account details
    const stripeAccount = await stripe.accounts.retrieve(stripeAccountId)

    // Save to our centralized collection
    await saveConnectedStripeAccount(userId, stripeAccount)

    // Also update the user's document for backward compatibility
    await adminDb.collection("users").doc(userId).update({
      stripeAccountId: stripeAccount.id,
      stripeAccountStatus: stripeAccount.details_submitted ? "active" : "pending",
      stripeChargesEnabled: stripeAccount.charges_enabled,
      stripePayoutsEnabled: stripeAccount.payouts_enabled,
      stripeDetailsSubmitted: stripeAccount.details_submitted,
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      account: {
        stripeAccountId: stripeAccount.id,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        email: stripeAccount.email,
      },
    })
  } catch (error) {
    console.error("❌ Error saving connected Stripe account:", error)
    return NextResponse.json(
      { error: "Failed to save connected account" },
      { status: 500 }
    )
  }
}
