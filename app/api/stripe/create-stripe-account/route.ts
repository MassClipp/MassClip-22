import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getSiteUrl } from "@/lib/url-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [Create Account] Starting Stripe account creation...")

    // Parse request body
    const body = await request.json()
    const { idToken } = body

    if (!idToken) {
      console.error("❌ [Create Account] No ID token provided")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the Firebase ID token
    const decodedToken = await db.auth().verifyIdToken(idToken)
    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    console.log(`👤 [Create Account] Authenticated user: ${userId} (${userEmail})`)

    // Check if user already has a Stripe account
    const userDoc = await db.firestore().collection("users").doc(userId).get()

    if (userDoc.exists) {
      const userData = userDoc.data()!
      if (userData.stripeAccountId) {
        console.log(`⚠️ [Create Account] User already has Stripe account: ${userData.stripeAccountId}`)

        // Check if account needs onboarding
        try {
          const account = await stripe.accounts.retrieve(userData.stripeAccountId)

          if (!account.charges_enabled || !account.payouts_enabled) {
            console.log("🔄 [Create Account] Account exists but needs onboarding")

            // Get base URL for redirect
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl()
            console.log(`🌐 [Create Account] Using base URL: ${baseUrl}`)

            // Create account onboarding link
            const accountLink = await stripe.accountLinks.create({
              account: userData.stripeAccountId,
              refresh_url: `${baseUrl}/dashboard/connect-stripe?refresh=true`,
              return_url: `${baseUrl}/dashboard/connect-stripe?success=true`,
              type: "account_onboarding",
            })

            console.log(`🔗 [Create Account] Generated onboarding link: ${accountLink.url}`)

            return NextResponse.json({
              success: true,
              url: accountLink.url,
              accountId: userData.stripeAccountId,
              existing: true,
            })
          } else {
            console.log("✅ [Create Account] Account already fully set up")
            return NextResponse.json({
              success: true,
              accountId: userData.stripeAccountId,
              alreadySetup: true,
            })
          }
        } catch (error) {
          console.error("❌ [Create Account] Error checking existing account:", error)
          // Continue to create new account if existing one is invalid
        }
      }
    }

    console.log("🆕 [Create Account] Creating new Stripe Express account...")

    // Create a new Stripe Express Connect account
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual", // Default to individual, can be updated during onboarding
      email: userEmail,
    })

    console.log(`✅ [Create Account] Created account: ${account.id}`)

    // Store the account ID in Firestore
    await db.firestore().collection("users").doc(userId).set(
      {
        stripeAccountId: account.id,
        stripeAccountCreatedAt: new Date(),
      },
      { merge: true },
    )

    console.log(`💾 [Create Account] Stored account ID for user ${userId}`)

    // Get the base URL for return and refresh URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl()
    console.log(`🌐 [Create Account] Using base URL: ${baseUrl}`)

    // Create account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/dashboard/connect-stripe?refresh=true`,
      return_url: `${baseUrl}/dashboard/connect-stripe?success=true`,
      type: "account_onboarding",
    })

    console.log(`🔗 [Create Account] Generated onboarding link: ${accountLink.url}`)

    // Return the onboarding URL
    return NextResponse.json({
      success: true,
      url: accountLink.url,
      accountId: account.id,
    })
  } catch (error: any) {
    console.error("❌ [Create Account] Error creating account:", error)

    // Provide detailed error information
    return NextResponse.json(
      {
        error: "Failed to create Stripe account",
        details: error.message,
        type: error.type || "unknown",
        code: error.code || "unknown",
      },
      { status: 500 },
    )
  }
}
