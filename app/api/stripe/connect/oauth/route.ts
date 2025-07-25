import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { adminAuth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  console.log("🔄 [OAuth] Starting OAuth flow initiation")

  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ [OAuth] Missing or invalid authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    console.log("🔑 [OAuth] ID token received:", idToken ? "present" : "missing")

    // Verify the Firebase ID token
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken)
      console.log("✅ [OAuth] Token verified for user:", decodedToken.uid)
    } catch (tokenError) {
      console.error("❌ [OAuth] Token verification failed:", tokenError)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Check required environment variables
    const stripeClientId = process.env.STRIPE_CLIENT_ID
    if (!stripeClientId) {
      console.error("❌ [OAuth] STRIPE_CLIENT_ID not configured")
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
    }

    // Get base URL ensuring it has protocol
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://massclip.pro"
    if (!baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl}`
    }

    console.log("🌐 [OAuth] Using base URL:", baseUrl)

    // Generate a unique state parameter
    const state = `${userId}_${Date.now()}_${Math.random().toString(36).substring(2)}`
    console.log("🎲 [OAuth] Generated state:", state.substring(0, 30) + "...")

    // Store state in Firestore with expiration
    const stateData = {
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    }

    try {
      await adminDb.collection("stripe_oauth_states").doc(state).set(stateData)
      console.log("💾 [OAuth] State stored in Firestore successfully")
    } catch (firestoreError) {
      console.error("❌ [OAuth] Failed to store state in Firestore:", firestoreError)
      return NextResponse.json(
        {
          error: "Failed to initialize OAuth flow",
          details: "Database error",
        },
        { status: 500 },
      )
    }

    // Construct OAuth URL
    const oauthUrl = new URL("https://connect.stripe.com/oauth/authorize")
    oauthUrl.searchParams.set("response_type", "code")
    oauthUrl.searchParams.set("client_id", stripeClientId)
    oauthUrl.searchParams.set("scope", "read_write")
    oauthUrl.searchParams.set("redirect_uri", `${baseUrl}/api/stripe/connect/oauth-callback`)
    oauthUrl.searchParams.set("state", state)

    console.log("🔗 [OAuth] Generated OAuth URL:", oauthUrl.toString())
    console.log("↩️ [OAuth] Redirect URI:", `${baseUrl}/api/stripe/connect/oauth-callback`)

    return NextResponse.json({
      success: true,
      url: oauthUrl.toString(),
      state,
    })
  } catch (error: any) {
    console.error("💥 [OAuth] Unexpected error:", error)
    console.error("📚 [OAuth] Error stack:", error.stack)

    return NextResponse.json(
      {
        error: "Failed to initiate OAuth flow",
        details: error.message || "Unknown error occurred",
        type: error.constructor.name,
      },
      { status: 500 },
    )
  }
}
