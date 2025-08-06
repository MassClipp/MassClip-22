import { type NextRequest, NextResponse } from "next/server"
import { verifyIdTokenFromRequest } from "@/lib/auth-utils"

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [OAuth] Generating Stripe Connect OAuth URL")

    // Verify authentication
    const decodedToken = await verifyIdTokenFromRequest(request)
    if (!decodedToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const userUID = decodedToken.uid
    console.log("✅ [OAuth] Authenticated user:", userUID)

    if (!STRIPE_CLIENT_ID) {
      console.error("❌ [OAuth] STRIPE_CLIENT_ID not configured")
      return NextResponse.json(
        { error: "Stripe client ID not configured" },
        { status: 500 }
      )
    }

    // Create state parameter with user UID
    const state = encodeURIComponent(JSON.stringify({ userId: userUID }))
    
    // Build OAuth URL
    const oauthUrl = new URL("https://connect.stripe.com/oauth/authorize")
    oauthUrl.searchParams.set("response_type", "code")
    oauthUrl.searchParams.set("client_id", STRIPE_CLIENT_ID)
    oauthUrl.searchParams.set("scope", "read_write")
    oauthUrl.searchParams.set("redirect_uri", `${SITE_URL}/api/stripe/connect/oauth-callback`)
    oauthUrl.searchParams.set("state", state)

    console.log("✅ [OAuth] OAuth URL generated:", oauthUrl.toString())

    return NextResponse.json({
      authUrl: oauthUrl.toString(),
      message: "OAuth URL generated successfully"
    })

  } catch (error) {
    console.error("❌ [OAuth] Error generating OAuth URL:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate OAuth URL" },
      { status: 500 }
    )
  }
}
