import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

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

    // Get user's Stripe account ID from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "User profile not found",
          code: "USER_NOT_FOUND",
        },
        { status: 404 },
      )
    }

    const userData = userDoc.data()
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const accountId = userData?.[accountIdField]

    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: "No Stripe account found. Please connect your account first.",
          code: "NO_ACCOUNT",
        },
        { status: 400 },
      )
    }

    console.log(`🔗 [Create Account Link] Creating link for account: ${accountId}`)

    // Parse request body for custom URLs
    let returnUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?success=true`
    let refreshUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?refresh=true`

    try {
      const body = await request.json()
      if (body.returnUrl) returnUrl = body.returnUrl
      if (body.refreshUrl) refreshUrl = body.refreshUrl
    } catch {
      // Use defaults if no body or invalid JSON
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
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

    if (error instanceof Error && error.message.includes("Stripe")) {
      return NextResponse.json(
        {
          success: false,
          error: "Stripe error",
          details: error.message,
          code: "STRIPE_ERROR",
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

// Handle GET requests by redirecting directly
export async function GET(request: NextRequest) {
  try {
    // For GET requests, we'll create the link and redirect immediately
    const response = await POST(request)
    const data = await response.json()

    if (data.success && data.url) {
      return NextResponse.redirect(data.url)
    } else {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?error=link_creation_failed`)
    }
  } catch (error) {
    console.error("❌ [Create Account Link GET] Error:", error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?error=server_error`)
  }
}
