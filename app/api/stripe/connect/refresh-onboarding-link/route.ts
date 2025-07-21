import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`[Refresh Onboarding] Refreshing link for user: ${userId}`)

    // Get user's Stripe account ID from database
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      return NextResponse.json({ error: "No Stripe account found" }, { status: 404 })
    }

    const accountId = userData.stripeAccountId

    // Verify account exists
    try {
      await stripe.accounts.retrieve(accountId)
    } catch (error: any) {
      if (error.code === "resource_missing") {
        return NextResponse.json({ error: "Stripe account not found" }, { status: 404 })
      }
      throw error
    }

    // Create fresh onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding/success`,
      type: "account_onboarding",
    })

    console.log(`[Refresh Onboarding] Created fresh onboarding link`)

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
      message: "Onboarding link refreshed successfully",
    })
  } catch (error: any) {
    console.error("[Refresh Onboarding] Error:", error)

    return NextResponse.json(
      {
        error: error.message || "Failed to refresh onboarding link",
        details: error.type || "unknown_error",
      },
      { status: 500 },
    )
  }
}
