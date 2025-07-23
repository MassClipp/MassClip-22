import { type NextRequest, NextResponse } from "next/server"
import { isTestMode } from "@/lib/stripe"
import { getAuth } from "firebase-admin/auth"

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [OAuth] Invalid ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`🚀 [OAuth] Starting OAuth flow for user: ${userId}`)

    // Generate OAuth URL for account connection
    const clientId = isTestMode ? process.env.STRIPE_CONNECT_CLIENT_ID_TEST : process.env.STRIPE_CONNECT_CLIENT_ID

    if (!clientId) {
      console.error(`❌ [OAuth] Missing Stripe Connect client ID for ${isTestMode ? "test" : "live"} mode`)
      return NextResponse.json(
        { error: `Missing Stripe Connect client ID for ${isTestMode ? "test" : "live"} mode` },
        { status: 500 },
      )
    }

    const state = Buffer.from(
      JSON.stringify({
        userId,
        timestamp: Date.now(),
        mode: isTestMode ? "test" : "live",
        flow: "oauth_connect",
      }),
    ).toString("base64")

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/stripe-oauth-callback`
    const oauthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

    console.log(`✅ [OAuth] Generated OAuth URL for user ${userId}`)

    return NextResponse.json({
      success: true,
      oauthUrl,
      message: "OAuth URL generated successfully",
    })
  } catch (error: any) {
    console.error("❌ [OAuth] Unexpected error:", error)
    return NextResponse.json({ error: "Failed to generate OAuth URL", details: error.message }, { status: 500 })
  }
}
