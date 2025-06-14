import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json(
        {
          isConnected: false,
          error: "No authentication token provided",
        },
        { status: 401 },
      )
    }

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Get user document from Firestore
    const userDoc = await db.collection("users").doc(uid).get()

    if (!userDoc.exists) {
      return NextResponse.json({
        isConnected: false,
        error: "User profile not found",
      })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({
        isConnected: false,
        needsOnboarding: true,
        message: "No Stripe account connected",
      })
    }

    // Check if the Stripe account is valid and active
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId)

      const isFullyOnboarded = account.charges_enabled && account.payouts_enabled && account.details_submitted

      return NextResponse.json({
        isConnected: true,
        accountId: stripeAccountId,
        needsOnboarding: !isFullyOnboarded,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      })
    } catch (stripeError) {
      console.error("Stripe account error:", stripeError)

      // Account might be invalid, remove from user profile
      await db.collection("users").doc(uid).update({
        stripeAccountId: null,
        stripeOnboardingComplete: false,
      })

      return NextResponse.json({
        isConnected: false,
        needsOnboarding: true,
        error: "Stripe account is invalid or inaccessible",
      })
    }
  } catch (error) {
    console.error("Error checking Stripe connection:", error)
    return NextResponse.json(
      {
        isConnected: false,
        error: "Failed to check connection status",
      },
      { status: 500 },
    )
  }
}
