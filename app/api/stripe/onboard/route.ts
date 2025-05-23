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

    // Check if user already has a Stripe account
    const userDoc = await db.collection("users").doc(uid).get()
    const userData = userDoc.data()

    if (userData?.stripeAccountId) {
      // Check if account is already fully onboarded
      const account = await stripe.accounts.retrieve(userData.stripeAccountId)
      if (account.details_submitted && account.charges_enabled) {
        return NextResponse.json({
          success: true,
          accountId: userData.stripeAccountId,
          alreadyOnboarded: true,
        })
      }
    }

    // Create new Stripe Connect account if doesn't exist
    let stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        country: "US", // You might want to make this dynamic
        email: decodedToken.email,
        metadata: {
          firebaseUid: uid,
        },
      })

      stripeAccountId = account.id

      // Save the Stripe account ID to Firestore
      await db.collection("users").doc(uid).update({
        stripeAccountId: stripeAccountId,
        stripeOnboardingStarted: new Date(),
      })
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/success`,
      type: "account_onboarding",
    })

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
      accountId: stripeAccountId,
    })
  } catch (error) {
    console.error("Error creating Stripe onboarding:", error)
    return NextResponse.json({ error: "Failed to create onboarding session" }, { status: 500 })
  }
}
