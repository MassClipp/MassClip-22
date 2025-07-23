import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { isTestMode } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      console.error("❌ [OAuth] No ID token provided")
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify the Firebase ID token
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(idToken)
      console.log("✅ [OAuth] Firebase token verified for user:", decodedToken.uid)
    } catch (error) {
      console.error("❌ [OAuth] Invalid ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get the appropriate Stripe Connect client ID based on environment
    const clientId = isTestMode ? process.env.STRIPE_CONNECT_CLIENT_ID_TEST : process.env.STRIPE_CONNECT_CLIENT_ID

    if (!clientId) {
      console.error(`❌ [OAuth] Missing Stripe Connect client ID for ${isTestMode ? "test" : "live"} mode`)
      return NextResponse.json(
        {
          error: "Stripe Connect not configured",
          details: `Missing client ID for ${isTestMode ? "test" : "live"} mode`,
        },
        { status: 500 },
      )
    }

    // Create state parameter with user info and security data
    const state = Buffer.from(
      JSON.stringify({
        userId,
        timestamp: Date.now(),
        mode: isTestMode ? "test" : "live",
        flow: "oauth_connect",
        nonce: Math.random().toString(36).substring(2, 15),
      }),
    ).toString("base64")

    // Build OAuth authorization URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL
    if (!baseUrl) {
      console.error("❌ [OAuth] No base URL configured")
      return NextResponse.json({ error: "Application URL not configured" }, { status: 500 })
    }

    const redirectUri = `${baseUrl}/api/stripe/connect/oauth-callback`

    const oauthUrl = new URL("https://connect.stripe.com/oauth/authorize")
    oauthUrl.searchParams.set("response_type", "code")
    oauthUrl.searchParams.set("client_id", clientId)
    oauthUrl.searchParams.set("scope", "read_write")
    oauthUrl.searchParams.set("redirect_uri", redirectUri)
    oauthUrl.searchParams.set("state", state)

    console.log(`🔗 [OAuth] Generated OAuth URL for user ${userId}:`, oauthUrl.toString())

    return NextResponse.json({
      success: true,
      oauthUrl: oauthUrl.toString(),
      redirectUri,
      state,
    })
  } catch (error: any) {
    console.error("❌ [OAuth] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate OAuth URL",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
