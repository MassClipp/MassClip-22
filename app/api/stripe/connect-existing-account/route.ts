import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { adminAuth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [Stripe] Connecting existing account via OAuth...")

    // Verify user authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("❌ [Stripe] No authorization header provided")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Stripe] Invalid ID token:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`🔧 [Stripe] Connecting existing account for user: ${userId}`)

    // Get base URL from environment
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro"
    console.log(`🔧 [Stripe] Using base URL: ${baseUrl}`)

    // Create OAuth link for existing account connection
    const oauthLink = await stripe.oauth.authorizeUrl({
      response_type: "code",
      client_id: process.env.STRIPE_CLIENT_ID!,
      scope: "read_write",
      redirect_uri: `${baseUrl}/api/stripe/oauth-callback`,
      state: userId, // Pass user ID in state parameter
    })

    console.log(`✅ [Stripe] Created OAuth link: ${oauthLink}`)

    return NextResponse.json({
      url: oauthLink,
      success: true,
    })
  } catch (error) {
    console.error("❌ [Stripe] Failed to create OAuth link:", error)

    return NextResponse.json({ error: "Failed to connect existing Stripe account" }, { status: 500 })
  }
}

// Handle GET requests for debugging
export async function GET() {
  return NextResponse.json({
    message: "Stripe existing account connection endpoint",
    method: "POST",
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro",
    stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
    hasClientId: !!process.env.STRIPE_CLIENT_ID,
  })
}
