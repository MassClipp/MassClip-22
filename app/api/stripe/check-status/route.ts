import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "No authentication token provided" }, { status: 401 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Get user's Stripe account ID
    const userDoc = await db.collection("users").doc(uid).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      return NextResponse.json({
        success: true,
        isOnboarded: false,
        canReceivePayments: false,
      })
    }

    // Check Stripe account status
    const account = await stripe.accounts.retrieve(userData.stripeAccountId)

    const isOnboarded = account.details_submitted && account.charges_enabled
    const canReceivePayments = account.payouts_enabled

    // Update Firestore with current status
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
    console.error("Error checking Stripe status:", error)
    return NextResponse.json({ error: "Failed to check onboarding status" }, { status: 500 })
  }
}
