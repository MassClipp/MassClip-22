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
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get("user-agent"),
  })

  const baseUrl = new URL(request.url).origin

  // Handle OAuth errors from Stripe
  if (error) {
    console.log("❌ [OAuth Callback] OAuth error from Stripe:", error)
    const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
    callbackUrl.searchParams.set("error", error)
    callbackUrl.searchParams.set("error_description", "OAuth error from Stripe")
    callbackUrl.searchParams.set(
      "debug_info",
      JSON.stringify({
        source: "stripe_oauth",
        timestamp: new Date().toISOString(),
        original_error: error,
      }),
    )
    return NextResponse.redirect(callbackUrl)
  }

  // Validate required parameters
  if (!code || !state) {
    console.log("❌ [OAuth Callback] Missing required parameters")
    const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
    callbackUrl.searchParams.set("error", "missing_parameters")
    callbackUrl.searchParams.set("error_description", "Missing authorization code or state")
    callbackUrl.searchParams.set(
      "debug_info",
      JSON.stringify({
        source: "parameter_validation",
        timestamp: new Date().toISOString(),
        has_code: !!code,
        has_state: !!state,
      }),
    )
    return NextResponse.redirect(callbackUrl)
  }

  try {
    // Verify state parameter
    console.log("🔍 [OAuth Callback] Verifying state parameter:", state)
    const stateDoc = await db.collection("oauth_states").doc(state).get()

    if (!stateDoc.exists) {
      console.log("❌ [OAuth Callback] Invalid state - not found in database")

      // Try to find any recent states for debugging
      const recentStates = await db
        .collection("oauth_states")
        .where("createdAt", ">", Date.now() - 60 * 60 * 1000) // Last hour
        .orderBy("createdAt", "desc")
        .limit(5)
        .get()

      const debugInfo = {
        source: "state_validation",
        timestamp: new Date().toISOString(),
        state_not_found: state,
        recent_states_count: recentStates.size,
        recent_states: recentStates.docs.map((doc) => ({
          id: doc.id,
          createdAt: doc.data().createdAt,
          used: doc.data().used,
          userId: doc.data().userId,
        })),
      }

      const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
      callbackUrl.searchParams.set("error", "invalid_state")
      callbackUrl.searchParams.set(
        "error_description",
        "Invalid state parameter - session may have expired or been corrupted",
      )
      callbackUrl.searchParams.set("debug_info", JSON.stringify(debugInfo))
      return NextResponse.redirect(callbackUrl)
    }

    const stateData = stateDoc.data()
    const stateAge = Date.now() - stateData?.createdAt

    console.log("✅ [OAuth Callback] State data found:", {
      userId: stateData?.userId,
      createdAt: stateData?.createdAt,
      used: stateData?.used,
      ageMinutes: Math.round(stateAge / (1000 * 60)),
    })

    // Check if state is expired (extend to 30 minutes for better UX)
    const maxAge = 30 * 60 * 1000 // 30 minutes instead of 15
    if (stateAge > maxAge) {
      console.log("❌ [OAuth Callback] State expired", {
        ageMinutes: Math.round(stateAge / (1000 * 60)),
        maxAgeMinutes: 30,
      })

      // For expired states, let's try to recover if possible
      const userId = stateData?.userId
      if (userId) {
        console.log("🔄 [OAuth Callback] Attempting recovery for expired state")

        // Check if user already has a Stripe connection
        const userDoc = await db.collection("users").doc(userId).get()
        const userData = userDoc.data()

        if (userData?.stripeAccountId) {
          console.log("✅ [OAuth Callback] User already has Stripe connection, redirecting to success")
          const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
          callbackUrl.searchParams.set("success", "true")
          callbackUrl.searchParams.set("recovered", "true")
          return NextResponse.redirect(callbackUrl)
        }
      }

      const debugInfo = {
        source: "state_expiration",
        timestamp: new Date().toISOString(),
        state_age_minutes: Math.round(stateAge / (1000 * 60)),
        max_age_minutes: 30,
        user_id: userId,
        recovery_attempted: true,
      }

      const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
      callbackUrl.searchParams.set("error", "expired_state")
      callbackUrl.searchParams.set(
        "error_description",
        `Session expired after ${Math.round(stateAge / (1000 * 60))} minutes`,
      )
      callbackUrl.searchParams.set("debug_info", JSON.stringify(debugInfo))
      return NextResponse.redirect(callbackUrl)
    }

    // Check if state was already used
    if (stateData?.used) {
      console.log("❌ [OAuth Callback] State already used")

      // Check if the connection was successful
      const userId = stateData?.userId
      if (userId) {
        const userDoc = await db.collection("users").doc(userId).get()
        const userData = userDoc.data()

        if (userData?.stripeAccountId) {
          console.log("✅ [OAuth Callback] State was used but connection exists, redirecting to success")
          const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
          callbackUrl.searchParams.set("success", "true")
          callbackUrl.searchParams.set("already_connected", "true")
          return NextResponse.redirect(callbackUrl)
        }
      }

      const debugInfo = {
        source: "state_reuse",
        timestamp: new Date().toISOString(),
        used_at: stateData?.usedAt,
        user_id: userId,
      }

      const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
      callbackUrl.searchParams.set("error", "used_state")
      callbackUrl.searchParams.set("error_description", "Connection already processed")
      callbackUrl.searchParams.set("debug_info", JSON.stringify(debugInfo))
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
      console.log("❌ [OAuth Callback] Token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText,
      })

      const debugInfo = {
        source: "token_exchange",
        timestamp: new Date().toISOString(),
        response_status: tokenResponse.status,
        response_text: errorText,
        code_length: code.length,
      }

      const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
      callbackUrl.searchParams.set("error", "token_exchange_failed")
      callbackUrl.searchParams.set(
        "error_description",
        `Failed to exchange authorization code (HTTP ${tokenResponse.status})`,
      )
      callbackUrl.searchParams.set("debug_info", JSON.stringify(debugInfo))
      return NextResponse.redirect(callbackUrl)
    }

    const tokenData = await tokenResponse.json()
    console.log("✅ [OAuth Callback] Token exchange successful:", {
      stripe_user_id: tokenData.stripe_user_id,
      scope: tokenData.scope,
      has_access_token: !!tokenData.access_token,
      has_refresh_token: !!tokenData.refresh_token,
    })

    // Save Stripe account info to user profile
    const userId = stateData.userId
    const updateData = {
      stripeAccountId: tokenData.stripe_user_id,
      stripeAccessToken: tokenData.access_token,
      stripeRefreshToken: tokenData.refresh_token,
      stripeScope: tokenData.scope,
      stripeConnectedAt: Date.now(),
      stripeConnectionStatus: "connected",
      lastStripeUpdate: Date.now(),
    }

    console.log("🔄 [OAuth Callback] Updating user profile for:", userId)
    await db.collection("users").doc(userId).update(updateData)

    console.log("✅ [OAuth Callback] User profile updated with Stripe info")

    // Verify the update was successful
    const updatedUserDoc = await db.collection("users").doc(userId).get()
    const updatedUserData = updatedUserDoc.data()

    if (!updatedUserData?.stripeAccountId) {
      console.error("❌ [OAuth Callback] Failed to verify user profile update")

      const debugInfo = {
        source: "profile_update_verification",
        timestamp: new Date().toISOString(),
        user_id: userId,
        update_attempted: updateData,
        profile_after_update: updatedUserData,
      }

      const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
      callbackUrl.searchParams.set("error", "profile_update_failed")
      callbackUrl.searchParams.set("error_description", "Failed to save Stripe connection to user profile")
      callbackUrl.searchParams.set("debug_info", JSON.stringify(debugInfo))
      return NextResponse.redirect(callbackUrl)
    }

    // Clean up the used state
    await stateDoc.ref.delete()

    // Redirect to success page
    const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
    callbackUrl.searchParams.set("success", "true")
    callbackUrl.searchParams.set("account_id", tokenData.stripe_user_id)
    return NextResponse.redirect(callbackUrl)
  } catch (error) {
    console.error("❌ [OAuth Callback] Processing error:", error)

    const debugInfo = {
      source: "processing_error",
      timestamp: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : "Unknown error",
      error_stack: error instanceof Error ? error.stack : undefined,
      state: state,
      code_length: code?.length,
    }

    const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
    callbackUrl.searchParams.set("error", "processing_failed")
    callbackUrl.searchParams.set(
      "error_description",
      error instanceof Error ? error.message : "Unknown processing error",
    )
    callbackUrl.searchParams.set("debug_info", JSON.stringify(debugInfo))
    return NextResponse.redirect(callbackUrl)
  }
}
