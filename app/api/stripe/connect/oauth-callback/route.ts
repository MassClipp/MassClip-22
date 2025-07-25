import type { NextRequest } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { redirect } from "next/navigation"

export async function GET(request: NextRequest) {
  console.log("🔄 [OAuth Callback] Processing Stripe OAuth callback")

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  console.log(`📥 [OAuth Callback] Received parameters:`)
  console.log(`   - code: ${code ? "present" : "missing"}`)
  console.log(`   - state: ${state || "missing"}`)
  console.log(`   - error: ${error || "none"}`)
  console.log(`   - error_description: ${errorDescription || "none"}`)

  // Handle Stripe errors
  if (error) {
    console.error(`❌ [OAuth Callback] Stripe returned error: ${error} - ${errorDescription}`)
    return redirect(
      `/dashboard/connect-stripe/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`,
    )
  }

  // Validate required parameters
  if (!code || !state) {
    console.error(`❌ [OAuth Callback] Missing required parameters - code: ${!!code}, state: ${!!state}`)
    return redirect(
      `/dashboard/connect-stripe/callback?error=invalid_request&error_description=${encodeURIComponent("Missing authorization code or state parameter")}`,
    )
  }

  try {
    console.log(`🔍 [OAuth Callback] Looking up state: ${state}`)

    // Look up the state in Firestore
    const stateDoc = await adminDb.collection("stripe_oauth_states").doc(state).get()

    if (!stateDoc.exists) {
      console.error(`❌ [OAuth Callback] State not found in database: ${state}`)

      // Debug: Check for recent states
      const recentStates = await adminDb
        .collection("stripe_oauth_states")
        .where("createdAt", ">", new Date(Date.now() - 30 * 60 * 1000))
        .limit(5)
        .get()

      console.log(`🔍 [OAuth Callback] Recent states in database: ${recentStates.size}`)
      recentStates.forEach((doc) => {
        console.log(`   - State: ${doc.id}, Created: ${doc.data().createdAt?.toDate()}, User: ${doc.data().userId}`)
      })

      return redirect(
        `/dashboard/connect-stripe/callback?error=invalid_state&error_description=${encodeURIComponent("OAuth state not found in database - session may have expired")}`,
      )
    }

    const stateData = stateDoc.data()!
    console.log(`✅ [OAuth Callback] Found state for user: ${stateData.userId}`)
    console.log(`📊 [OAuth Callback] State data:`, {
      userId: stateData.userId,
      email: stateData.email,
      createdAt: stateData.createdAt?.toDate(),
      expiresAt: stateData.expiresAt?.toDate(),
      used: stateData.used,
    })

    // Check if state has expired
    if (stateData.expiresAt && stateData.expiresAt.toDate() < new Date()) {
      console.error(`❌ [OAuth Callback] State has expired: ${state}`)
      await adminDb.collection("stripe_oauth_states").doc(state).delete()
      return redirect(
        `/dashboard/connect-stripe/callback?error=expired_state&error_description=${encodeURIComponent("OAuth state has expired - please try connecting again")}`,
      )
    }

    // Check if state has already been used
    if (stateData.used) {
      console.error(`❌ [OAuth Callback] State has already been used: ${state}`)
      return redirect(
        `/dashboard/connect-stripe/callback?error=used_state&error_description=${encodeURIComponent("OAuth state has already been used")}`,
      )
    }

    // Mark state as used
    console.log(`🔒 [OAuth Callback] Marking state as used: ${state}`)
    await adminDb.collection("stripe_oauth_states").doc(state).update({ used: true, usedAt: new Date() })

    // Exchange code for access token
    console.log(`🔄 [OAuth Callback] Exchanging code for access token`)
    const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_secret: process.env.STRIPE_SECRET_KEY!,
        code: code,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error(`❌ [OAuth Callback] Token exchange failed:`, {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText,
      })
      return redirect(
        `/dashboard/connect-stripe/callback?error=token_exchange_failed&error_description=${encodeURIComponent("Failed to exchange authorization code for access token")}`,
      )
    }

    const tokenData = await tokenResponse.json()
    console.log(`✅ [OAuth Callback] Token exchange successful for account: ${tokenData.stripe_user_id}`)

    // Store Stripe account info in user's profile
    console.log(`💾 [OAuth Callback] Storing Stripe account info for user: ${stateData.userId}`)
    await adminDb.collection("users").doc(stateData.userId).update({
      stripeAccountId: tokenData.stripe_user_id,
      stripeAccessToken: tokenData.access_token,
      stripeRefreshToken: tokenData.refresh_token,
      stripePublishableKey: tokenData.stripe_publishable_key,
      stripeConnectedAt: new Date(),
      stripeScope: tokenData.scope,
      updatedAt: new Date(),
    })

    // Clean up the used state
    console.log(`🧹 [OAuth Callback] Cleaning up used state: ${state}`)
    await adminDb.collection("stripe_oauth_states").doc(state).delete()

    console.log(`🎉 [OAuth Callback] OAuth flow completed successfully for user: ${stateData.userId}`)

    // Redirect to success page
    return redirect("/dashboard/connect-stripe/callback?success=true")
  } catch (error: any) {
    console.error("❌ [OAuth Callback] Error processing callback:", error)

    // Clean up state on error
    if (state) {
      try {
        await adminDb.collection("stripe_oauth_states").doc(state).delete()
        console.log(`🧹 [OAuth Callback] Cleaned up state after error: ${state}`)
      } catch (cleanupError) {
        console.error(`❌ [OAuth Callback] Failed to clean up state: ${cleanupError}`)
      }
    }

    return redirect(
      `/dashboard/connect-stripe/callback?error=processing_failed&error_description=${encodeURIComponent(error.message)}`,
    )
  }
}
