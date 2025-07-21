import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
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

    console.log("Refreshing onboarding link for user:", userId)

    // Get user's Stripe account ID from database
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      return NextResponse.json({ error: "No Stripe account found" }, { status: 404 })
    }

    const accountId = userData.stripeAccountId

    // Create new onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding?refresh=true&account=${accountId}`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding/success?account=${accountId}`,
      type: "account_onboarding",
    })

    console.log("Created refreshed onboarding link:", accountLink.url)

    return NextResponse.json({
      success: true,
      accountId: accountId,
      onboardingUrl: accountLink.url,
      message: "Onboarding link refreshed successfully",
    })
  } catch (error) {
    console.error("Error refreshing onboarding link:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to refresh onboarding link",
        details: error instanceof Stripe.errors.StripeError ? error.type : undefined,
      },
      { status: 500 },
    )
  }
}
