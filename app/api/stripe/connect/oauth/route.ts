import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { isTestMode } from "@/lib/stripe"

interface OAuthBody {
  idToken: string
  accountId?: string
}

export async function POST(request: NextRequest) {
  try {
    const { idToken, accountId } = (await request.json()) as OAuthBody

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication token is required",
        },
        { status: 400 },
      )
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log(`✅ [OAuth] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [OAuth] Token verification failed:", tokenError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired authentication token",
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid

    // Generate OAuth link for connecting a Stripe account
    // This is the proper way to establish a Connect relationship
    try {
      // Get the client ID from environment variables
      const clientId = isTestMode ? process.env.STRIPE_CONNECT_CLIENT_ID_TEST : process.env.STRIPE_CONNECT_CLIENT_ID

      if (!clientId) {
        throw new Error(`Missing Stripe Connect client ID for ${isTestMode ? "test" : "live"} mode`)
      }

      // Generate state parameter to prevent CSRF
      const state = Buffer.from(
        JSON.stringify({
          userId,
          timestamp: Date.now(),
          mode: isTestMode ? "test" : "live",
        }),
      ).toString("base64")

      // Generate OAuth URL
      const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/stripe-oauth-callback`
      const oauthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

      console.log(`✅ [OAuth] Generated OAuth URL for user ${userId}`)

      return NextResponse.json({
        success: true,
        oauthUrl,
        state,
        mode: isTestMode ? "test" : "live",
      })
    } catch (error: any) {
      console.error("❌ [OAuth] Failed to generate OAuth URL:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate OAuth URL",
          details: error.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [OAuth] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to start OAuth process",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
