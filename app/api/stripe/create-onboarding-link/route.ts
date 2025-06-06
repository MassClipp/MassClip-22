import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, db } from "@/lib/firebase-admin"

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
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

    let stripeAccountId = userData?.stripeAccountId

    // If user doesn't have a Stripe account, create one
    if (!stripeAccountId) {
      console.log(`Creating new Stripe account for user ${uid}`)

      const account = await stripe.accounts.create({
        type: "standard",
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

      console.log(`Created Stripe account ${stripeAccountId} for user ${uid}`)
    } else {
      console.log(`User ${uid} already has Stripe account ${stripeAccountId}`)
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: "https://massclip.pro/dashboard?retry=stripe",
      return_url: "https://massclip.pro/dashboard?success=stripe",
      type: "account_onboarding",
    })

    console.log(`Created onboarding link for account ${stripeAccountId}`)

    return NextResponse.json({
      success: true,
      url: accountLink.url,
    })
  } catch (error) {
    console.error("Error creating Stripe onboarding link:", error)
    return NextResponse.json({ error: "Failed to create onboarding link" }, { status: 500 })
  }
}
