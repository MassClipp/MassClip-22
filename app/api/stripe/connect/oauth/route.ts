import { NextResponse } from "next/server"
import { adminDb, auth } from "@/lib/firebase-admin"
import Stripe from "stripe"

export async function POST(request: Request) {
  try {
    console.log("OAuth route called")

    const { idToken } = await request.json()
    console.log("ID token received:", !!idToken)

    if (!idToken) {
      console.log("No ID token provided")
      return NextResponse.json({ error: "ID token required" }, { status: 400 })
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("Token verified for user:", decodedToken.uid)
    } catch (error: any) {
      console.error("Token verification failed:", error)
      return NextResponse.json(
        {
          error: "Invalid ID token",
          details: error.message,
          code: error.code,
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid

    // Check environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY not configured")
      return NextResponse.json({ error: "Stripe not configured - missing STRIPE_SECRET_KEY" }, { status: 500 })
    }

    if (!process.env.STRIPE_CLIENT_ID) {
      console.error("STRIPE_CLIENT_ID not configured")
      return NextResponse.json({ error: "Stripe not configured - missing STRIPE_CLIENT_ID" }, { status: 500 })
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    })

    // Generate state parameter
    const state = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`
    console.log("Generated state:", state)

    // Store state in Firestore
    try {
      await adminDb
        .collection("stripe_oauth_states")
        .doc(state)
        .set({
          userId,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        })
      console.log("State stored in Firestore")
    } catch (error: any) {
      console.error("Failed to store state:", error)
      return NextResponse.json(
        {
          error: "Failed to store OAuth state",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Construct base URL
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    if (!baseUrl) {
      console.error("NEXT_PUBLIC_BASE_URL not configured")
      return NextResponse.json({ error: "Base URL not configured" }, { status: 500 })
    }

    // Ensure baseUrl has protocol
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`
    }

    const redirectUri = `${baseUrl}/api/stripe/connect/oauth-callback`
    console.log("Redirect URI:", redirectUri)

    // Create Stripe OAuth URL
    const oauthUrl = new URL("https://connect.stripe.com/oauth/authorize")
    oauthUrl.searchParams.set("response_type", "code")
    oauthUrl.searchParams.set("client_id", process.env.STRIPE_CLIENT_ID)
    oauthUrl.searchParams.set("scope", "read_write")
    oauthUrl.searchParams.set("redirect_uri", redirectUri)
    oauthUrl.searchParams.set("state", state)

    const finalUrl = oauthUrl.toString()
    console.log("Final OAuth URL:", finalUrl)

    return NextResponse.json({
      oauthUrl: finalUrl,
      state,
      redirectUri,
    })
  } catch (error: any) {
    console.error("OAuth route error:", error)
    return NextResponse.json(
      {
        error: "Failed to initiate OAuth flow",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
