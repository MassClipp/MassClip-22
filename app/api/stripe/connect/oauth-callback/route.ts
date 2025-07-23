import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    // Handle OAuth errors from Stripe
    if (error) {
      console.error(`❌ [Stripe OAuth] Error: ${error} - ${errorDescription}`)
      return NextResponse.json(
        {
          error: "oauth_error",
          message: errorDescription || "OAuth authorization failed",
        },
        { status: 400 },
      )
    }

    // Check if code parameter is present
    if (!code) {
      console.error("❌ [Stripe OAuth] Missing authorization code")
      return NextResponse.json(
        {
          error: "missing_code",
          message: "Authorization code is required",
        },
        { status: 400 },
      )
    }

    console.log(`🔄 [Stripe OAuth] Processing authorization code: ${code.substring(0, 20)}...`)

    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    })

    const { stripe_user_id, access_token, refresh_token, livemode, scope } = response

    console.log(`✅ [Stripe OAuth] Successfully connected account: ${stripe_user_id}`)
    console.log(`📊 [Stripe OAuth] Connection details:`, {
      stripe_user_id,
      livemode,
      scope,
      has_access_token: !!access_token,
      has_refresh_token: !!refresh_token,
    })

    // Here you would typically save the connection details to your database
    // For example:
    // await saveStripeConnection(userId, {
    //   stripe_user_id,
    //   access_token,
    //   refresh_token,
    //   livemode,
    //   scope,
    // })

    // Redirect to dashboard with success message
    const redirectUrl = new URL("/dashboard/earnings", request.url)
    redirectUrl.searchParams.set("connected", "success")

    return NextResponse.redirect(redirectUrl)
  } catch (error: any) {
    console.error("❌ [Stripe OAuth] Error processing callback:", error)

    // Handle specific Stripe errors
    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        {
          error: "invalid_request",
          message: error.message,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "callback_failed",
        message: "Failed to process OAuth callback",
      },
      { status: 500 },
    )
  }
}
