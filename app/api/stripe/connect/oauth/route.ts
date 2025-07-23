import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { isTestMode } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log(`🔗 [OAuth] Starting Stripe Connect OAuth flow`)

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
    console.log(`✅ [OAuth] User authenticated: ${userId}`)

    // Get the correct client ID based on environment
    const clientId = isTestMode ? process.env.STRIPE_CONNECT_CLIENT_ID_TEST : process.env.STRIPE_CONNECT_CLIENT_ID

    if (!clientId) {
      console.error(`❌ [OAuth] Missing Stripe Connect client ID for ${isTestMode ? "test" : "live"} mode`)
      return NextResponse.json(
        {
          success: false,
          error: "Stripe Connect not configured",
          code: "MISSING_CONFIG",
        },
        { status: 500 },
      )
    }

    // Create state parameter with user info
    const state = Buffer.from(
      JSON.stringify({
        userId,
        timestamp: Date.now(),
        mode: isTestMode ? "test" : "live",
      }),
    ).toString("base64")

    // Build OAuth URL
    const oauthUrl = new URL("https://connect.stripe.com/oauth/authorize")
    oauthUrl.searchParams.set("response_type", "code")
    oauthUrl.searchParams.set("client_id", clientId)
    oauthUrl.searchParams.set("scope", "read_write")
    oauthUrl.searchParams.set("redirect_uri", `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/connect/oauth-callback`)
    oauthUrl.searchParams.set("state", state)

    // Add suggested capabilities for better onboarding experience
    oauthUrl.searchParams.set("suggested_capabilities[]", "card_payments")
    oauthUrl.searchParams.set("suggested_capabilities[]", "transfers")

    console.log(`✅ [OAuth] OAuth URL created for ${isTestMode ? "test" : "live"} mode`)

    return NextResponse.json({
      success: true,
      url: oauthUrl.toString(),
      mode: isTestMode ? "test" : "live",
    })
  } catch (error) {
    console.error("❌ [OAuth] Error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create OAuth URL",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    )
  }
}
