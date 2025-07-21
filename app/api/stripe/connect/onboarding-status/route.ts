import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify the Firebase token
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log("Checking onboarding status for user:", userId)

    // Get user's Stripe account ID from database
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      console.log("No Stripe account found for user")
      return NextResponse.json({
        connected: false,
        onboardingRequired: true,
      })
    }

    const accountId = userData.stripeAccountId
    console.log("Found Stripe account:", accountId)

    // Get account details from Stripe
    try {
      const account = await stripe.accounts.retrieve(accountId)

      // Check if account is fully onboarded
      const isFullyOnboarded = account.details_submitted && account.charges_enabled && account.payouts_enabled

      console.log("Account status:", {
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        fully_onboarded: isFullyOnboarded,
      })

      return NextResponse.json({
        connected: isFullyOnboarded,
        accountId: account.id,
        onboardingRequired: !isFullyOnboarded,
        account: {
          id: account.id,
          type: account.type,
          country: account.country,
          email: account.email,
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          requirements: account.requirements,
        },
      })
    } catch (stripeError) {
      console.error("Error retrieving Stripe account:", stripeError)

      // Account might have been deleted or is invalid
      // Remove invalid account ID from user profile
      await db.collection("users").doc(userId).update({
        stripeAccountId: null,
        stripeAccountType: null,
        stripeConnectedAt: null,
      })

      return NextResponse.json({
        connected: false,
        onboardingRequired: true,
        error: "Stripe account not found or invalid",
      })
    }
  } catch (error) {
    console.error("Error checking onboarding status:", error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Failed to check onboarding status" }, { status: 500 })
  }
}
