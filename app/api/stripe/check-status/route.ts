import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: NextRequest) {
  try {
    // Get the ID token from the request
    const { idToken, stripeAccountId } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "No ID token provided" }, { status: 401 })
    }

    if (!stripeAccountId) {
      return NextResponse.json({ error: "No Stripe account ID provided" }, { status: 400 })
    }

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    console.log("Checking Stripe status for user:", uid)
    console.log("Stripe account ID:", stripeAccountId)

    // Retrieve the Stripe account
    const account = await stripe.accounts.retrieve(stripeAccountId)

    console.log("Stripe account retrieved:", {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    })

    // Check if onboarding is complete
    const onboardingComplete = account.charges_enabled && account.payouts_enabled && account.details_submitted

    // Update Firestore with the latest status
    const userRef = db.collection("users").doc(uid)
    await userRef.update({
      stripeAccountId: account.id,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      stripeOnboardingComplete: onboardingComplete,
      stripeStatusLastChecked: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      onboardingComplete,
      detailsSubmitted: account.details_submitted || false,
    })
  } catch (error) {
    console.error("Error checking Stripe status:", error)
    return NextResponse.json(
      { error: "Failed to check Stripe status", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
