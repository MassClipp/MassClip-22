import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: NextRequest) {
  try {
    console.log(`🔗 [Create Account Link] Starting account link creation`)

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
    console.log(`✅ [Create Account Link] User authenticated: ${userId}`)

    // Parse request body
    const { accountId, returnUrl, refreshUrl } = await request.json()

    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: "Account ID is required",
          code: "MISSING_ACCOUNT_ID",
        },
        { status: 400 },
      )
    }

    console.log(`🔗 [Create Account Link] Creating link for account: ${accountId}`)

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe`,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/success`,
      type: "account_onboarding",
    })

    console.log(`✅ [Create Account Link] Account link created successfully`)

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      accountId,
      expiresAt: accountLink.expires_at,
    })
  } catch (error) {
    console.error("❌ [Create Account Link] Error:", error)

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          success: false,
          error: "Stripe error",
          details: error.message,
          code: error.code,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create account link",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    )
  }
}
