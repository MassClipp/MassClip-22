import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log(`🔗 [Create Stripe Account] Starting account creation`)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    const userEmail = decodedToken.email
    console.log(`✅ [Create Stripe Account] User authenticated: ${userId}`)

    // Create Stripe Express account
    console.log(`🏦 [Create Stripe Account] Creating Express account for user: ${userId}`)

    const account = await stripe.accounts.create({
      type: "express",
      email: userEmail,
      metadata: {
        userId: userId,
        createdAt: new Date().toISOString(),
      },
    })

    console.log(`✅ [Create Stripe Account] Account created: ${account.id}`)

    // Get base URL from environment
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL
    if (!baseUrl) {
      console.error(`❌ [Create Stripe Account] Missing NEXT_PUBLIC_BASE_URL in environment`)
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error",
          code: "MISSING_BASE_URL",
        },
        { status: 500 },
      )
    }

    // Create account onboarding link
    console.log(`🔗 [Create Stripe Account] Creating onboarding link for account: ${account.id}`)

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/dashboard/connect-stripe`,
      return_url: `${baseUrl}/dashboard/stripe/success`,
      type: "account_onboarding",
    })

    console.log(`✅ [Create Stripe Account] Onboarding link created successfully`)

    // Store account ID in user's profile (you may want to save this to your database)
    // For now, we'll just return the URL for frontend redirection

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      accountId: account.id,
      expiresAt: accountLink.expires_at,
    })
  } catch (error: any) {
    console.error("❌ [Create Stripe Account] Error:", error)

    // Handle specific Stripe errors
    if (error.type === "StripeCardError") {
      return NextResponse.json(
        {
          success: false,
          error: "Card error",
          details: error.message,
          code: error.code,
        },
        { status: 400 },
      )
    }

    if (error.type === "StripeRateLimitError") {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          details: "Too many requests. Please try again later.",
          code: "RATE_LIMIT",
        },
        { status: 429 },
      )
    }

    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: error.message,
          code: error.code,
        },
        { status: 400 },
      )
    }

    if (error.type === "StripeAPIError") {
      return NextResponse.json(
        {
          success: false,
          error: "Stripe API error",
          details: "An error occurred with Stripe's API",
          code: "STRIPE_API_ERROR",
        },
        { status: 502 },
      )
    }

    if (error.type === "StripeConnectionError") {
      return NextResponse.json(
        {
          success: false,
          error: "Connection error",
          details: "Network error communicating with Stripe",
          code: "CONNECTION_ERROR",
        },
        { status: 502 },
      )
    }

    if (error.type === "StripeAuthenticationError") {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication error",
          details: "Invalid Stripe API key",
          code: "STRIPE_AUTH_ERROR",
        },
        { status: 401 },
      )
    }

    // Generic error fallback
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create Stripe account",
        details: error.message || "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    )
  }
}
