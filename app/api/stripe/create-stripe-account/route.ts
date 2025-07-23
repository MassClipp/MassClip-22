import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getSiteUrl } from "@/lib/url-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [CreateAccount] Starting Stripe account creation...")

    // Parse request body
    const body = await request.json()
    const { idToken } = body

    if (!idToken) {
      console.error("❌ [CreateAccount] No ID token provided")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the Firebase ID token
    const decodedToken = await db.auth().verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`👤 [CreateAccount] Authenticated user: ${userId}`)

    // Get user data from Firestore
    const userDoc = await db.firestore().collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.error("❌ [CreateAccount] User document not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()!

    // Check if user already has a Stripe account
    if (userData.stripeAccountId) {
      console.log(`🏦 [CreateAccount] User already has account: ${userData.stripeAccountId}`)

      // Create onboarding link for existing account
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl()

      const accountLink = await stripe.accountLinks.create({
        account: userData.stripeAccountId,
        refresh_url: `${baseUrl}/dashboard/connect-stripe?refresh=true`,
        return_url: `${baseUrl}/dashboard/connect-stripe?success=true`,
        type: "account_onboarding",
      })

      return NextResponse.json({
        success: true,
        onboardingUrl: accountLink.url,
        accountId: userData.stripeAccountId,
      })
    }

    // Create new Stripe Express account
    console.log("🏦 [CreateAccount] Creating new Stripe Express account...")

    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: userData.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        mcc: "5815", // Digital goods
        product_description: "Digital content and media",
      },
    })

    console.log(`✅ [CreateAccount] Created Stripe account: ${account.id}`)

    // Save the account ID to Firestore
    await db.firestore().collection("users").doc(userId).update({
      stripeAccountId: account.id,
      stripeAccountCreatedAt: new Date().toISOString(),
      stripeAccountStatus: "pending",
    })

    // Get base URL for redirect
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl()
    console.log(`🌐 [CreateAccount] Using base URL: ${baseUrl}`)

    // Create account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/dashboard/connect-stripe?refresh=true`,
      return_url: `${baseUrl}/dashboard/connect-stripe?success=true`,
      type: "account_onboarding",
    })

    console.log(`🔗 [CreateAccount] Generated onboarding link: ${accountLink.url}`)

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
      accountId: account.id,
    })
  } catch (error: any) {
    console.error("❌ [CreateAccount] Error creating account:", error)
    return NextResponse.json(
      {
        error: "Failed to create Stripe account",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
