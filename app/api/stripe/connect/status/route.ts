import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    // Get the Firebase ID token from the request
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Get the user document from Firestore
    const userDoc = await db.collection("users").doc(uid).get()
    const userData = userDoc.data()

    // If user doesn't have a Stripe account, return not onboarded
    if (!userData?.stripeAccountId) {
      return NextResponse.json({
        success: true,
        isOnboarded: false,
        canReceivePayments: false,
      })
    }

    // Retrieve the Stripe account
    const account = await stripe.accounts.retrieve(userData.stripeAccountId)

    // Check if the account is fully onboarded and can receive payments
    const isOnboarded = account.details_submitted && account.charges_enabled
    const canReceivePayments = account.payouts_enabled

    // Update the user document with the latest Stripe status
    await db.collection("users").doc(uid).update({
      stripeOnboarded: isOnboarded,
      stripePayoutsEnabled: canReceivePayments,
      stripeStatusLastChecked: new Date(),
    })

    return NextResponse.json({
      success: true,
      isOnboarded,
      canReceivePayments,
      accountId: userData.stripeAccountId,
      requirements: account.requirements,
    })
  } catch (error) {
    console.error("Error checking Stripe Connect status:", error)
    return NextResponse.json({ error: "Failed to check Stripe Connect status" }, { status: 500 })
  }
}
