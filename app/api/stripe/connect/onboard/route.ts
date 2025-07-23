import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getSiteUrl } from "@/lib/url-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [Onboard] Starting Stripe Connect onboarding flow...")

    // Get the Stripe Connect client ID
    const clientId = process.env.STRIPE_CLIENT_ID

    if (!clientId) {
      console.error("❌ [Onboard] STRIPE_CLIENT_ID environment variable is not set")
      return NextResponse.json(
        {
          error: "Stripe Connect not configured",
          details: "STRIPE_CLIENT_ID environment variable is missing",
          suggestion: "Add STRIPE_CLIENT_ID to your environment variables",
        },
        { status: 500 },
      )
    }

    console.log(`✅ [Onboard] Using Stripe Client ID: ${clientId.substring(0, 20)}...`)

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
    const accountId = userData.stripeAccountId

    if (!accountId) {
      console.error("❌ [Onboard] No Stripe account ID found for user")
      return NextResponse.json({ error: "No Stripe account found" }, { status: 404 })
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
      },
      { status: 500 },
    )
  }
}
