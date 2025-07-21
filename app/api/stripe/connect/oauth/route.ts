import { type NextRequest, NextResponse } from "next/server"
import { isTestMode } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`🔄 [OAuth Init] Creating OAuth link for user: ${userId}`)

    // Create state parameter with user info and timestamp
    const state = Buffer.from(
      JSON.stringify({
        userId,
        timestamp: Date.now(),
      }),
    ).toString("base64")

    // Get the appropriate client ID based on environment
    const clientId = isTestMode ? process.env.STRIPE_CONNECT_CLIENT_ID_TEST : process.env.STRIPE_CONNECT_CLIENT_ID

    if (!clientId) {
      console.error(`❌ [OAuth Init] Missing Stripe Connect client ID for ${isTestMode ? "test" : "live"} mode`)
      return NextResponse.json(
        { error: `Stripe Connect client ID not configured for ${isTestMode ? "test" : "live"} mode` },
        { status: 500 },
      )
    }

    // Build OAuth URL
    const baseUrl = "https://connect.stripe.com/oauth/authorize"
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: "read_write", // Full access for Express accounts
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/connect/oauth-callback`,
      state,
      "stripe_user[email]": "", // Optional: pre-fill if you have user email
      "stripe_user[url]": process.env.NEXT_PUBLIC_SITE_URL || "",
      "stripe_user[country]": "US", // Optional: pre-fill country
    })

    const oauthUrl = `${baseUrl}?${params.toString()}`

    console.log(`✅ [OAuth Init] Generated OAuth URL for user ${userId} in ${isTestMode ? "test" : "live"} mode`)

    return NextResponse.json({
      url: oauthUrl,
      mode: isTestMode ? "test" : "live",
    })
  } catch (error: any) {
    console.error("❌ [OAuth Init] Error creating OAuth link:", error)
    return NextResponse.json({ error: "Failed to create OAuth link", details: error.message }, { status: 500 })
  }
}
