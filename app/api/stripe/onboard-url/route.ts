import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getSiteUrl } from "@/lib/url-utils"
import { auth, firestore } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [Onboard URL] Starting account onboarding URL generation...")

    // Parse request body
    const body = await request.json()
    const { idToken } = body

    if (!idToken) {
      console.error("❌ [Onboard URL] No ID token provided")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    console.log(`👤 [Onboard URL] Authenticated user: ${userId} (${userEmail})`)

    // Check required environment variables
    const requiredEnvVars = {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    }

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      console.error("❌ [Onboard URL] Missing environment variables:", missingVars)
      return NextResponse.json(
        {
          error: "Stripe not configured",
          details: `Missing environment variables: ${missingVars.join(", ")}`,
          missingVars,
        },
        { status: 500 },
      )
    }

    // Get base URL for redirects
    const baseUrl = requiredEnvVars.NEXT_PUBLIC_BASE_URL || getSiteUrl()
    console.log(`🌐 [Onboard URL] Using base URL: ${baseUrl}`)

    // Check if user already has a Stripe account
    const userDoc = await firestore.collection("users").doc(userId).get()
    let accountId: string | null = null

    if (userDoc.exists) {
      const userData = userDoc.data()!
      accountId = userData.stripeAccountId || null

      if (accountId) {
        console.log(`🔍 [Onboard URL] Found existing account: ${accountId}`)

        // Check if account needs onboarding
        try {
          const account = await stripe.accounts.retrieve(accountId)

          if (account.charges_enabled && account.payouts_enabled) {
            console.log("✅ [Onboard URL] Account already fully set up")
            return NextResponse.json({
              success: true,
              accountId,
              alreadySetup: true,
              message: "Your Stripe account is already fully configured",
            })
          }

          console.log("🔄 [Onboard URL] Account exists but needs onboarding")
        } catch (error) {
          console.error("❌ [Onboard URL] Error checking existing account:", error)
          // Continue to create new account if existing one is invalid
          accountId = null
        }
      }
    }

    // Create new account if none exists
    if (!accountId) {
      console.log("🆕 [Onboard URL] Creating new Stripe Express account...")

      const account = await stripe.accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        email: userEmail,
      })

      accountId = account.id
      console.log(`✅ [Onboard URL] Created account: ${accountId}`)

      // Store the account ID in Firestore
      await firestore.collection("users").doc(userId).set(
        {
          stripeAccountId: accountId,
          stripeAccountCreatedAt: new Date(),
        },
        { merge: true },
      )

      console.log(`💾 [Onboard URL] Stored account ID for user ${userId}`)
    }

    // Create account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/earnings?refresh=true`,
      return_url: `${baseUrl}/dashboard/earnings?success=true`,
      type: "account_onboarding",
    })

    console.log(`🔗 [Onboard URL] Generated onboarding link: ${accountLink.url}`)

    // Validate the generated URL
    try {
      new URL(accountLink.url)
      console.log("✅ [Onboard URL] URL validation passed")
    } catch (urlError) {
      console.error("❌ [Onboard URL] Invalid URL generated:", accountLink.url)
      return NextResponse.json(
        {
          error: "Invalid onboarding URL generated",
          details: "The generated URL is malformed",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
      accountId,
      existing: !!userDoc.exists,
      baseUrl,
    })
  } catch (error: any) {
    console.error("❌ [Onboard URL] Error:", error)

    return NextResponse.json(
      {
        error: "Failed to generate onboarding URL",
        details: error.message,
        type: error.type || "unknown",
        code: error.code || "unknown",
      },
      { status: 500 },
    )
  }
}
