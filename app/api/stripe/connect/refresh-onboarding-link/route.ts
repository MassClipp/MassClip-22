import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
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

    console.log("Refreshing onboarding link for user:", userId)

    // Get user's Stripe account ID from database
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      return NextResponse.json({ error: "No Stripe account found. Please create an account first." }, { status: 400 })
    }

    const accountId = userData.stripeAccountId
    console.log("Refreshing onboarding for account:", accountId)

    // Verify account exists
    try {
      await stripe.accounts.retrieve(accountId)
    } catch (stripeError) {
      console.error("Stripe account not found:", stripeError)
      return NextResponse.json({ error: "Stripe account not found or invalid" }, { status: 400 })
    }

    // Create fresh onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding/success`,
      type: "account_onboarding",
    })

    console.log("Fresh onboarding link created:", accountLink.url)

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
      accountId: accountId,
    })
  } catch (error) {
    console.error("Error refreshing onboarding link:", error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Failed to refresh onboarding link" }, { status: 500 })
  }
}
