import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const headersList = await headers()
    const authorization = headersList.get("authorization")

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const idToken = authorization.split("Bearer ")[1]

    // Verify Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log("Checking onboarding status for user:", userId)

    // Get user's Stripe account ID from database
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      return NextResponse.json({
        connected: false,
        onboardingRequired: true,
        message: "No Stripe account found",
      })
    }

    const accountId = userData.stripeAccountId

    // Get account details from Stripe
    try {
      const account = await stripe.accounts.retrieve(accountId)

      const isConnected = account.details_submitted && account.charges_enabled && account.payouts_enabled

      // Update database with current status
      await adminDb
        .collection("users")
        .doc(userId)
        .update({
          stripeOnboardingCompleted: isConnected,
          stripeAccountStatus: {
            details_submitted: account.details_submitted,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            country: account.country,
          },
          updatedAt: new Date().toISOString(),
        })

      return NextResponse.json({
        connected: isConnected,
        accountId: accountId,
        onboardingRequired: !isConnected,
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

      // Account might be invalid, reset user's stripe data
      await adminDb.collection("users").doc(userId).update({
        stripeAccountId: null,
        stripeOnboardingCompleted: false,
        updatedAt: new Date().toISOString(),
      })

      return NextResponse.json({
        connected: false,
        onboardingRequired: true,
        error: "Stripe account not accessible",
        message: "Please set up your Stripe account again",
      })
    }
  } catch (error) {
    console.error("Error checking onboarding status:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to check onboarding status",
        connected: false,
        onboardingRequired: true,
      },
      { status: 500 },
    )
  }
}
