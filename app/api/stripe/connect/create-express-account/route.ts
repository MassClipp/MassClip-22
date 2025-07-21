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

    console.log("Creating Express account for user:", userId)

    // Check if user already has a Stripe account
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (userData?.stripeAccountId) {
      console.log("User already has Stripe account:", userData.stripeAccountId)

      // Check if account is fully onboarded
      try {
        const account = await stripe.accounts.retrieve(userData.stripeAccountId)

        if (account.details_submitted && account.charges_enabled) {
          return NextResponse.json({
            success: true,
            alreadyConnected: true,
            accountId: userData.stripeAccountId,
            message: "Stripe account already connected",
          })
        }
      } catch (error) {
        console.log("Existing account not accessible, creating new one")
      }
    }

    // Parse request body
    const body = await request.json()
    const { country = "US", businessType = "individual", email } = body

    // Create Express account
    const account = await stripe.accounts.create({
      type: "express",
      country: country,
      email: email || decodedToken.email,
      business_type: businessType,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: "daily",
          },
        },
      },
    })

    console.log("Created Express account:", account.id)

    // Save account ID to user profile
    await adminDb.collection("users").doc(userId).update({
      stripeAccountId: account.id,
      stripeAccountType: "express",
      stripeOnboardingCompleted: false,
      updatedAt: new Date().toISOString(),
    })

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding?refresh=true&account=${account.id}`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding/success?account=${account.id}`,
      type: "account_onboarding",
    })

    console.log("Created onboarding link:", accountLink.url)

    return NextResponse.json({
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
      message: "Express account created successfully",
    })
  } catch (error) {
    console.error("Error creating Express account:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create Express account",
        details: error instanceof Stripe.errors.StripeError ? error.type : undefined,
      },
      { status: 500 },
    )
  }
}
