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
    const userEmail = decodedToken.email

    console.log(`[Express Account] Creating account for user: ${userId}`)

    // Check if user already has a connected Stripe account
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (userData?.stripeAccountId) {
      console.log(`[Express Account] User already has account: ${userData.stripeAccountId}`)

      // Verify the account still exists and is valid
      try {
        const account = await stripe.accounts.retrieve(userData.stripeAccountId)

        if (account.details_submitted && account.charges_enabled) {
          return NextResponse.json({
            success: true,
            alreadyConnected: true,
            accountId: userData.stripeAccountId,
            message: "Stripe account already connected and ready",
          })
        }
      } catch (error) {
        console.log(`[Express Account] Existing account invalid, creating new one`)
      }
    }

    // Parse request body
    const body = await request.json()
    const { country = "US", businessType = "individual", email } = body

    // Create Express account
    console.log(`[Express Account] Creating new Express account...`)

    const account = await stripe.accounts.create({
      type: "express",
      country: country,
      email: email || userEmail,
      business_type: businessType,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        platform_user_id: userId,
        created_via: "platform_onboarding",
      },
    })

    console.log(`[Express Account] Created account: ${account.id}`)

    // Save account ID to user profile
    await db.collection("users").doc(userId).update({
      stripeAccountId: account.id,
      stripeAccountType: "express",
      stripeConnectedAt: new Date().toISOString(),
    })

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding/success`,
      type: "account_onboarding",
    })

    console.log(`[Express Account] Created onboarding link: ${accountLink.url}`)

    return NextResponse.json({
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
      message: "Express account created successfully",
    })
  } catch (error: any) {
    console.error("[Express Account] Error:", error)

    return NextResponse.json(
      {
        error: error.message || "Failed to create Express account",
        details: error.type || "unknown_error",
      },
      { status: 500 },
    )
  }
}
