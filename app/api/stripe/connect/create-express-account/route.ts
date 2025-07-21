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
    const userEmail = decodedToken.email

    console.log("Creating Express account for user:", userId)

    // Check if user already has a Stripe account
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (userData?.stripeAccountId) {
      console.log("User already has Stripe account:", userData.stripeAccountId)

      // Check if the account still exists and is valid
      try {
        const account = await stripe.accounts.retrieve(userData.stripeAccountId)

        return NextResponse.json({
          alreadyConnected: true,
          accountId: account.id,
          account: {
            id: account.id,
            type: account.type,
            country: account.country,
            email: account.email,
            details_submitted: account.details_submitted,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
          },
        })
      } catch (error) {
        console.log("Existing account not found, creating new one")
        // Continue to create new account if existing one is invalid
      }
    }

    // Parse request body
    const body = await request.json()
    const { country = "US", businessType = "individual", email } = body

    // Create Express account
    console.log("Creating new Express account...")
    const account = await stripe.accounts.create({
      type: "express",
      country: country,
      email: email || userEmail,
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

    console.log("Express account created:", account.id)

    // Save account ID to user profile
    await db.collection("users").doc(userId).update({
      stripeAccountId: account.id,
      stripeAccountType: "express",
      stripeConnectedAt: new Date().toISOString(),
    })

    console.log("Account ID saved to user profile")

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding/success`,
      type: "account_onboarding",
    })

    console.log("Onboarding link created:", accountLink.url)

    return NextResponse.json({
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
      account: {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      },
    })
  } catch (error) {
    console.error("Error creating Express account:", error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Failed to create Express account" }, { status: 500 })
  }
}
