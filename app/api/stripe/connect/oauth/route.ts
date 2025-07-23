import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { isTestMode } from "@/lib/stripe"
import { getAuth } from "firebase-admin/auth"

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
    console.log(`🚀 [OAuth] Starting OAuth process for user: ${userId}`)

    // Get user data from Firestore to ensure user exists
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      console.error("❌ [OAuth] User not found in Firestore:", userId)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get the appropriate client ID based on test/live mode
    const clientId = isTestMode
      ? process.env.STRIPE_CONNECT_CLIENT_ID_TEST || process.env.STRIPE_CLIENT_ID
      : process.env.STRIPE_CONNECT_CLIENT_ID || process.env.STRIPE_CLIENT_ID

    console.log(`🔍 [OAuth] Environment check:`, {
      isTestMode,
      hasClientId: !!clientId,
      clientIdSource: isTestMode ? "STRIPE_CONNECT_CLIENT_ID_TEST" : "STRIPE_CONNECT_CLIENT_ID",
    })

    if (!clientId) {
      console.error(`❌ [OAuth] Missing Stripe Connect client ID for ${isTestMode ? "test" : "live"} mode`)

      // Provide helpful error message with environment variable names
      const missingVar = isTestMode ? "STRIPE_CONNECT_CLIENT_ID_TEST" : "STRIPE_CONNECT_CLIENT_ID"
      return NextResponse.json(
        {
          error: "Stripe Connect not configured",
          details: `Missing environment variable: ${missingVar}`,
          suggestion: `Please add ${missingVar} to your environment variables`,
          mode: isTestMode ? "test" : "live",
        },
        { status: 500 },
      )
    }

    // Create secure state parameter
    const state = Buffer.from(
      JSON.stringify({
        userId,
        timestamp: Date.now(),
        mode: isTestMode ? "test" : "live",
        flow: "oauth_connect",
        nonce: Math.random().toString(36).substring(2, 15),
      }),
    ).toString("base64")

    // Build redirect URI
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000"

    const redirectUri = `${baseUrl}/api/stripe/connect/oauth-callback`

    // Build OAuth URL
    const oauthUrl = new URL("https://connect.stripe.com/oauth/authorize")
    oauthUrl.searchParams.set("response_type", "code")
    oauthUrl.searchParams.set("client_id", clientId)
    oauthUrl.searchParams.set("scope", "read_write")
    oauthUrl.searchParams.set("redirect_uri", redirectUri)
    oauthUrl.searchParams.set("state", state)

    console.log(`🔗 [OAuth] Generated OAuth URL for ${isTestMode ? "test" : "live"} mode`)
    console.log(`🔗 [OAuth] Redirect URI: ${redirectUri}`)

    return NextResponse.json({
      success: true,
      oauthUrl: oauthUrl.toString(),
      redirectUri,
      mode: isTestMode ? "test" : "live",
      message: "OAuth URL generated successfully",
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
