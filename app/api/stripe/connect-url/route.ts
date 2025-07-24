import { type NextRequest, NextResponse } from "next/server"
import { getSiteUrl } from "@/lib/url-utils"
import { auth, firestore } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [Connect URL] Starting OAuth URL generation...")

    // Parse request body
    const body = await request.json()
    const { idToken } = body

    if (!idToken) {
      console.error("❌ [Connect URL] No ID token provided")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`👤 [Connect URL] Authenticated user: ${userId}`)

    // Check all required environment variables
    const requiredEnvVars = {
      STRIPE_CLIENT_ID: process.env.STRIPE_CLIENT_ID,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    }

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      console.error("❌ [Connect URL] Missing environment variables:", missingVars)
      return NextResponse.json(
        {
          error: "Stripe Connect not configured",
          details: `Missing environment variables: ${missingVars.join(", ")}`,
          missingVars,
          suggestion: "Add the missing environment variables to your Vercel dashboard",
        },
        { status: 500 },
      )
    }

    const clientId = requiredEnvVars.STRIPE_CLIENT_ID!
    console.log(`✅ [Connect URL] Using Stripe Client ID: ${clientId.substring(0, 20)}...`)

    // Get base URL for redirect (with fallback)
    const baseUrl = requiredEnvVars.NEXT_PUBLIC_BASE_URL || getSiteUrl()
    console.log(`🌐 [Connect URL] Using base URL: ${baseUrl}`)

    // Generate a secure state parameter
    const state = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Store the state in Firestore for verification (with TTL)
    await firestore
      .collection("stripe_oauth_states")
      .doc(state)
      .set({
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      })

    console.log(`🔐 [Connect URL] Generated state: ${state}`)

    // Build the OAuth URL with all required parameters
    const oauthUrl = new URL("https://connect.stripe.com/oauth/authorize")
    oauthUrl.searchParams.set("response_type", "code")
    oauthUrl.searchParams.set("client_id", clientId)
    oauthUrl.searchParams.set("scope", "read_write")
    oauthUrl.searchParams.set("redirect_uri", `${baseUrl}/api/stripe/connect/oauth-callback`)
    oauthUrl.searchParams.set("state", state)

    const finalUrl = oauthUrl.toString()
    console.log(`🔗 [Connect URL] Generated OAuth URL: ${finalUrl}`)

    // Validate the generated URL
    try {
      new URL(finalUrl)
      console.log("✅ [Connect URL] URL validation passed")
    } catch (urlError) {
      console.error("❌ [Connect URL] Invalid URL generated:", finalUrl)
      return NextResponse.json(
        {
          error: "Invalid OAuth URL generated",
          details: "The generated URL is malformed",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      oauthUrl: finalUrl,
      state,
      clientId: clientId.substring(0, 20) + "...", // Partial for debugging
      baseUrl,
    })
  } catch (error: any) {
    console.error("❌ [Connect URL] Error generating OAuth URL:", error)

    // Provide detailed error information
    return NextResponse.json(
      {
        error: "Failed to generate OAuth URL",
        details: error.message,
        type: error.type || "unknown",
      },
      { status: 500 },
    )
  }
}
