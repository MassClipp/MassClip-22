import { type NextRequest, NextResponse } from "next/server"
import { verifyIdTokenFromRequest } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [Create Express Account] Starting Express account creation...")

    // Verify authentication
    const decodedToken = await verifyIdTokenFromRequest(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("✅ [Create Express Account] Authenticated user:", userId)

    // Check if user already has a connected account
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (userData?.stripeAccountId && userData?.stripeConnected) {
      console.log("ℹ️ [Create Express Account] User already has connected account:", userData.stripeAccountId)
      return NextResponse.json({
        success: true,
        alreadyConnected: true,
        accountId: userData.stripeAccountId,
        message: "Stripe account already connected",
      })
    }

    // Parse request body for additional account info
    const body = await request.json().catch(() => ({}))
    const { country = "US", businessType = "individual", email = decodedToken.email } = body

    console.log("🏦 [Create Express Account] Creating Express account with:", {
      country,
      businessType,
      email: email ? "provided" : "none",
    })

    // Create Express Connect account
    const account = await stripe.accounts.create({
      type: "express", // Express accounts can be managed by platforms
      country: country,
      email: email,
      capabilities: {
        // Request the capabilities your platform needs
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: businessType,
      metadata: {
        userId: userId,
        email: email || "",
        createdAt: new Date().toISOString(),
        platform: "massclip",
      },
    })

    console.log("✅ [Create Express Account] Express account created:", account.id)

    // Save initial account info to database
    await db.collection("users").doc(userId).set(
      {
        stripeAccountId: account.id,
        stripeAccountType: account.type,
        stripeAccountCountry: account.country,
        stripeConnected: false, // Will be set to true after onboarding completion
        stripeOnboardingStarted: true,
        stripeOnboardingStartedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    )

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding?refresh=true&account=${account.id}`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding/success?account=${account.id}`,
      type: "account_onboarding",
    })

    console.log("✅ [Create Express Account] Onboarding link created")

    return NextResponse.json({
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
      message: "Express account created successfully",
    })
  } catch (error: any) {
    console.error("❌ [Create Express Account] Error:", error)

    // Handle specific Stripe errors
    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        {
          error: "Invalid request to Stripe",
          details: error.message,
          code: error.code,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to create Express account",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
