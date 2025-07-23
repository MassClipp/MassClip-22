import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { isTestMode } from "@/lib/stripe"

interface OAuthRequest {
  idToken: string
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as OAuthRequest

    if (!idToken) {
      console.error("❌ [OAuth] No ID token provided")
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(idToken)
      console.log("✅ [OAuth] Firebase token verified for user:", decodedToken.uid)
    } catch (error) {
      console.error("❌ [OAuth] Invalid ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Use single STRIPE_CLIENT_ID for both test and live modes
    const clientId = process.env.STRIPE_CLIENT_ID

    if (!clientId) {
      console.error("❌ [OAuth] Missing STRIPE_CLIENT_ID environment variable")
      return NextResponse.json(
        {
          error: "Stripe Connect not configured",
          details: "STRIPE_CLIENT_ID environment variable is missing",
          suggestion: "Please add STRIPE_CLIENT_ID to your environment variables",
        },
        { status: 500 },
      )
    }

    console.log(`🔗 [OAuth] Creating OAuth URL for user ${userId} in ${isTestMode ? "TEST" : "LIVE"} mode`)

    // Create state parameter with user info
    const state = Buffer.from(
      JSON.stringify({
        userId,
        timestamp: Date.now(),
        mode: isTestMode ? "test" : "live",
        flow: "oauth_connect",
      }),
    ).toString("base64")

    // Get base URL for redirect
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL
    if (!baseUrl) {
      console.error("❌ [OAuth] Missing base URL configuration")
      return NextResponse.json(
        {
          error: "Configuration error",
          details: "Base URL not configured",
        },
        { status: 500 },
      )
    }

    const redirectUri = `${baseUrl}/api/stripe/connect/oauth-callback`

    // Build Stripe OAuth URL
    const oauthUrl = new URL("https://connect.stripe.com/oauth/authorize")
    oauthUrl.searchParams.set("response_type", "code")
    oauthUrl.searchParams.set("client_id", clientId)
    oauthUrl.searchParams.set("scope", "read_write")
    oauthUrl.searchParams.set("redirect_uri", redirectUri)
    oauthUrl.searchParams.set("state", state)

    console.log(`✅ [OAuth] Generated OAuth URL for ${isTestMode ? "TEST" : "LIVE"} mode`)

    return NextResponse.json({
      success: true,
      oauthUrl: oauthUrl.toString(),
      mode: isTestMode ? "test" : "live",
    })
  } catch (error: any) {
    console.error("❌ [OAuth] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to create OAuth URL",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
