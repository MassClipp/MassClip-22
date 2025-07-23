import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getSiteUrl } from "@/lib/url-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [Onboard] Starting Stripe Connect onboarding flow...")

    // Parse request body
    const body = await request.json()
    const { idToken } = body

    if (!idToken) {
      console.error("❌ [Onboard] No ID token provided")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the Firebase ID token
    const decodedToken = await db.auth().verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`👤 [Onboard] Authenticated user: ${userId}`)

    // Get user data from Firestore
    const userDoc = await db.firestore().collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.error("❌ [Onboard] User document not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()!
    let accountId = userData.stripeAccountId

    // If no account exists, create one
    if (!accountId) {
      console.log("🏦 [Onboard] Creating new Stripe account...")

      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: userData.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })

      accountId = account.id
      console.log(`✅ [Onboard] Created Stripe account: ${accountId}`)

      // Save the account ID to Firestore
      await db.firestore().collection("users").doc(userId).update({
        stripeAccountId: accountId,
        stripeAccountCreatedAt: new Date().toISOString(),
      })
    }

    console.log(`🏦 [Onboard] Using Stripe account: ${accountId}`)

    // Get base URL for redirect
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl()
    console.log(`🌐 [Onboard] Using base URL: ${baseUrl}`)

    // Create account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/connect-stripe?refresh=true`,
      return_url: `${baseUrl}/dashboard/connect-stripe?success=true`,
      type: "account_onboarding",
    })

    console.log(`🔗 [Onboard] Generated onboarding link: ${accountLink.url}`)

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
      accountId,
    })
  } catch (error: any) {
    console.error("❌ [Onboard] Error creating onboarding link:", error)
    return NextResponse.json(
      {
        error: "Failed to create onboarding link",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
