import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Validate environment variables
    const clientId = process.env.STRIPE_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({ error: "Stripe client ID not configured" }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL_2 || process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro"
    // Remove www. if present to match Stripe settings
    const cleanBaseUrl = baseUrl.replace(/^https?:\/\/www\./, "https://")
    const redirectUri = `${cleanBaseUrl}/api/stripe/connect/oauth-callback`

    console.log("[v0] Stripe OAuth - Base URL:", baseUrl)
    console.log("[v0] Stripe OAuth - Clean Base URL:", cleanBaseUrl)
    console.log("[v0] Stripe OAuth - Redirect URI:", redirectUri)

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: "read_write",
      redirect_uri: redirectUri,
      state: userId, // Pass user ID as state for security
    })

    const authUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`

    return NextResponse.json({ url: authUrl, authUrl })
  } catch (error) {
    console.error("Error generating OAuth URL:", error)
    return NextResponse.json({ error: "Failed to generate OAuth URL" }, { status: 500 })
  }
}
