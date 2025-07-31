import { type NextRequest, NextResponse } from "next/server"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"
import { randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  console.log("🚀 [OAuth] Starting Stripe Connect OAuth flow")

  try {
    // Get authenticated user
    const headers = Object.fromEntries(request.headers.entries())
    const user = await getAuthenticatedUser(headers)
    console.log(`✅ [OAuth] Authenticated user: ${user.uid}`)

    // Generate secure state parameter
    const state = randomBytes(32).toString("hex")
    console.log(`🔐 [OAuth] Generated state: ${state}`)

    // Store state in Firestore with expiration
    const stateDoc = {
      userId: user.uid,
      email: user.email,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      used: false,
      userAgent: headers["user-agent"] || "unknown",
    }

    console.log(`💾 [OAuth] Storing state in Firestore for user ${user.uid}`)
    await adminDb.collection("stripe_oauth_states").doc(state).set(stateDoc)

    // Verify the state was stored
    const storedState = await adminDb.collection("stripe_oauth_states").doc(state).get()
    if (!storedState.exists) {
      console.error(`❌ [OAuth] Failed to store state ${state} in Firestore`)
      return NextResponse.json(
        {
          error: "Failed to initialize OAuth flow",
          code: "STATE_STORAGE_FAILED",
          details: "Could not store OAuth state in database",
        },
        { status: 500 },
      )
    }

    console.log(`✅ [OAuth] State ${state} successfully stored and verified`)

    // Build Stripe OAuth URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"
    const redirectUri = `${baseUrl}/api/stripe/connect/oauth-callback`

    const stripeOAuthUrl = new URL("https://connect.stripe.com/oauth/authorize")
    stripeOAuthUrl.searchParams.set("response_type", "code")
    stripeOAuthUrl.searchParams.set("client_id", process.env.STRIPE_CLIENT_ID!)
    stripeOAuthUrl.searchParams.set("scope", "read_write")
    stripeOAuthUrl.searchParams.set("redirect_uri", redirectUri)
    stripeOAuthUrl.searchParams.set("state", state)

    console.log(`🔗 [OAuth] Redirect URI: ${redirectUri}`)
    console.log(`🔗 [OAuth] Stripe OAuth URL: ${stripeOAuthUrl.toString()}`)

    return NextResponse.json({
      success: true,
      authUrl: stripeOAuthUrl.toString(),
      state: state,
      redirectUri: redirectUri,
      message: "OAuth flow initialized successfully",
    })
  } catch (error: any) {
    console.error("❌ [OAuth] Error in OAuth initiation:", error)

    return NextResponse.json(
      {
        error: "Failed to initialize OAuth flow",
        code: "OAUTH_INIT_FAILED",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
