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

    // Check if user already has a Stripe account
    const userDoc = await db.collection("users").doc(uid).get()
    const userData = userDoc.data()

    // If user already has a Stripe account, check if it's fully onboarded
    if (userData?.stripeAccountId) {
      try {
        const account = await stripe.accounts.retrieve(userData.stripeAccountId)

        // If account is already fully onboarded, return success
        if (account.details_submitted && account.charges_enabled) {
          return NextResponse.json({
            success: true,
            accountId: userData.stripeAccountId,
            onboardingComplete: true,
          })
        }

        // If account exists but onboarding is incomplete, create a new account link
        const accountLink = await stripe.accountLinks.create({
          account: userData.stripeAccountId,
          refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/refresh`,
          return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/success`,
          type: "account_onboarding",
        })

        return NextResponse.json({
          success: true,
          accountId: userData.stripeAccountId,
          onboardingUrl: accountLink.url,
          onboardingComplete: false,
        })
      } catch (error) {
        console.error("Error retrieving Stripe account:", error)
        // If there's an error retrieving the account, create a new one
      }
    }

    // Create a new Stripe Connect account
    const account = await stripe.accounts.create({
      type: "standard",
      email: decodedToken.email,
      metadata: {
        firebaseUid: uid,
      },
    })

    // Save the Stripe account ID to Firestore
    await db.collection("users").doc(uid).update({
      stripeAccountId: account.id,
      stripeOnboardingStarted: new Date(),
    })

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/success`,
      type: "account_onboarding",
    })

    return NextResponse.json({
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
      onboardingComplete: false,
    })
  } catch (error) {
    console.error("Error creating Stripe Connect account:", error)
    return NextResponse.json({ error: "Failed to create Stripe Connect account" }, { status: 500 })
  }
}
