import { type NextRequest, NextResponse } from "next/server"
import { getSiteUrl } from "@/lib/url-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [OAuth] Starting Stripe Connect OAuth flow...")

    // Get the Stripe Connect client ID - always use live
    const clientId = process.env.STRIPE_CLIENT_ID

    if (!clientId) {
      console.error("❌ [OAuth] STRIPE_CLIENT_ID environment variable is not set")
      return NextResponse.json(
        {
          error: "Stripe Connect not configured",
          details: "STRIPE_CLIENT_ID environment variable is missing",
          suggestion: "Add STRIPE_CLIENT_ID to your environment variables in Vercel dashboard",
        },
        { status: 500 },
      )
    }

    console.log(`✅ [OAuth] Using Stripe Client ID: ${clientId.substring(0, 20)}...`)

    // Parse request body
    const body = await request.json()
    const { idToken } = body

    if (!idToken) {
      console.error("❌ [OAuth] No ID token provided")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the Firebase ID token
    const decodedToken = await db.auth().verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`👤 [OAuth] Authenticated user: ${userId}`)

    // Get base URL for redirect
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl()
    console.log(`🌐 [OAuth] Using base URL: ${baseUrl}`)

    // Generate a state parameter for security
    const state = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Store the state in Firestore for verification
    await db
      .firestore()
      .collection("stripe_oauth_states")
      .doc(state)
      .set({
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      })

    console.log(`🔐 [OAuth] Generated state: ${state}`)

    // Build the OAuth URL
    const oauthUrl = new URL("https://connect.stripe.com/oauth/authorize")
    oauthUrl.searchParams.set("response_type", "code")
    oauthUrl.searchParams.set("client_id", clientId)
    oauthUrl.searchParams.set("scope", "read_write")
    oauthUrl.searchParams.set("redirect_uri", `${baseUrl}/dashboard/earnings/api/stripe/connect/oauth-callback`)
    oauthUrl.searchParams.set("state", state)

    const finalUrl = oauthUrl.toString()
    console.log(`🔗 [OAuth] Generated OAuth URL: ${finalUrl}`)

    return NextResponse.json({
      success: true,
      oauthUrl: finalUrl,
      state,
    })
  } catch (error: any) {
    console.error("❌ [OAuth] Error in OAuth flow:", error)
    return NextResponse.json(
      {
        error: "Failed to initiate OAuth flow",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
