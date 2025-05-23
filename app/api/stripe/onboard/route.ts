import { NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, db } from "@/lib/firebase-admin"
import { cookies } from "next/headers"

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function GET() {
  try {
    // Get the session cookie
    const sessionCookie = cookies().get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the session cookie and get the user ID
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true)
    const uid = decodedClaims.uid

    console.log(`Processing Stripe onboarding for user ${uid}`)

    // Check if user already has a Stripe account
    const userDoc = await db.collection("users").doc(uid).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    let stripeAccountId = userData?.stripeAccountId

    // If user doesn't have a Stripe account, create one
    if (!stripeAccountId) {
      console.log(`Creating new Stripe account for user ${uid}`)

      const account = await stripe.accounts.create({
        type: "standard",
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

    // Generate a fresh account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: "https://massclip.pro/dashboard",
      return_url: "https://massclip.pro/dashboard",
      type: "account_onboarding",
    })

    console.log(`Generated onboarding link for account ${stripeAccountId}`)

    // Return the onboarding URL
    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error("Error in Stripe onboarding:", error)
    return NextResponse.json({ error: "Failed to create onboarding link" }, { status: 500 })
  }
}
