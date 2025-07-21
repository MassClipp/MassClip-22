import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [Stripe Onboard] Starting onboarding process...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    console.log("🔑 [Stripe Onboard] Auth header present:", !!authHeader)

    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ [Stripe Onboard] Invalid or missing Bearer token")
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "No valid Bearer token found in Authorization header",
        },
        { status: 401 },
      )
    }

    // Extract and verify token
    const token = authHeader.replace("Bearer ", "")
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Stripe Onboard] Token verified for user:", decodedToken.uid)
    } catch (error: any) {
      console.error("❌ [Stripe Onboard] Token verification failed:", error.message)
      return NextResponse.json(
        {
          error: "Invalid authentication token",
          details: error.message,
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    // Create Stripe Connect account
    try {
      console.log("🏦 [Stripe Onboard] Creating Stripe Connect account...")

      const account = await stripe.accounts.create({
        type: "express",
        country: "US", // Default to US, can be made configurable
        email: decodedToken.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          userId: userId,
          email: decodedToken.email || "",
        },
      })

      console.log("✅ [Stripe Onboard] Stripe account created:", account.id)

      // Update user document
      await db.collection("users").doc(userId).set(
        {
          stripeAccountId: account.id,
          stripeAccountStatus: "pending",
          stripeAccountType: account.type,
          stripeAccountCountry: account.country,
          updatedAt: new Date(),
        },
        { merge: true },
      )

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?success=true`,
        type: "account_onboarding",
      })

      console.log("✅ [Stripe Onboard] Account link created")

      return NextResponse.json({
        success: true,
        accountId: account.id,
        onboardingUrl: accountLink.url,
        message: "Stripe account created successfully",
      })
    } catch (stripeError: any) {
      console.error("❌ [Stripe Onboard] Stripe error:", stripeError.message)
      return NextResponse.json(
        {
          error: "Failed to create Stripe account",
          details: stripeError.message,
        },
        { status: 400 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Stripe Onboard] Unexpected error:", error.message)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
