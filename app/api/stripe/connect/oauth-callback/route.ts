import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  console.log("🔄 [OAuth Callback] Received callback with params:", {
    code: code ? "present" : "missing",
    state: state ? "present" : "missing",
    error,
  })

  const baseUrl = new URL(request.url).origin

  // Handle OAuth errors from Stripe
  if (error) {
    console.log("❌ [OAuth Callback] OAuth error from Stripe:", error)
    const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
    callbackUrl.searchParams.set("error", error)
    callbackUrl.searchParams.set("error_description", "OAuth error from Stripe")
    return NextResponse.redirect(callbackUrl)
  }

  // Validate required parameters
  if (!code || !state) {
    console.log("❌ [OAuth Callback] Missing required parameters")
    const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
    callbackUrl.searchParams.set("error", "missing_parameters")
    callbackUrl.searchParams.set("error_description", "Missing authorization code or state")
    return NextResponse.redirect(callbackUrl)
  }

  try {
    // Verify state parameter
    console.log("🔍 [OAuth Callback] Verifying state parameter:", state)
    const stateDoc = await db.collection("oauth_states").doc(state).get()

    if (!stateDoc.exists) {
      console.log("❌ [OAuth Callback] Invalid state - not found in database")
      const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
      callbackUrl.searchParams.set("error", "invalid_state")
      callbackUrl.searchParams.set("error_description", "Invalid state parameter - session may have expired")
      return NextResponse.redirect(callbackUrl)
    }

    const stateData = stateDoc.data()
    console.log("✅ [OAuth Callback] State data found:", {
      userId: stateData?.userId,
      createdAt: stateData?.createdAt,
      used: stateData?.used,
    })

    // Check if state is expired (15 minutes)
    const stateAge = Date.now() - stateData?.createdAt
    if (stateAge > 15 * 60 * 1000) {
      console.log("❌ [OAuth Callback] State expired")
      const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
      callbackUrl.searchParams.set("error", "expired_state")
      callbackUrl.searchParams.set("error_description", "Session expired")
      return NextResponse.redirect(callbackUrl)
    }

    // Check if state was already used
    if (stateData?.used) {
      console.log("❌ [OAuth Callback] State already used")
      const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
      callbackUrl.searchParams.set("error", "used_state")
      callbackUrl.searchParams.set("error_description", "Connection already processed")
      return NextResponse.redirect(callbackUrl)
    }

    // Mark state as used
    await stateDoc.ref.update({ used: true, usedAt: Date.now() })

    // Exchange authorization code for access token
    console.log("🔄 [OAuth Callback] Exchanging code for access token")
    const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_secret: process.env.STRIPE_SECRET_KEY!,
        code,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.log("❌ [OAuth Callback] Token exchange failed:", errorText)
      const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
      callbackUrl.searchParams.set("error", "token_exchange_failed")
      callbackUrl.searchParams.set("error_description", "Failed to exchange authorization code")
      return NextResponse.redirect(callbackUrl)
    }

    const tokenData = await tokenResponse.json()
    console.log("✅ [OAuth Callback] Token exchange successful:", {
      stripe_user_id: tokenData.stripe_user_id,
      scope: tokenData.scope,
    })

    // Save Stripe account info to user profile
    const userId = stateData.userId
    await db.collection("users").doc(userId).update({
      stripeAccountId: tokenData.stripe_user_id,
      stripeAccessToken: tokenData.access_token,
      stripeRefreshToken: tokenData.refresh_token,
      stripeScope: tokenData.scope,
      stripeConnectedAt: Date.now(),
      stripeConnectionStatus: "connected",
    })

    console.log("✅ [OAuth Callback] User profile updated with Stripe info")

    // Redirect to success page
    const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
    callbackUrl.searchParams.set("success", "true")
    return NextResponse.redirect(callbackUrl)
  } catch (error) {
    console.error("❌ [OAuth Callback] Processing error:", error)
    const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
    callbackUrl.searchParams.set("error", "processing_failed")
    callbackUrl.searchParams.set("error_description", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.redirect(callbackUrl)
  }
}
