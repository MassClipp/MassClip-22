import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-server"
import { stripe } from "@/lib/stripe"

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
    const stateAge = Date.now() - stateData?.createdAt
    const userId = stateData?.userId

    console.log("✅ [OAuth Callback] State data found:", {
      userId,
      createdAt: stateData?.createdAt,
      used: stateData?.used,
      ageMinutes: Math.round(stateAge / (1000 * 60)),
    })

    // Check if state is expired (60 minutes for better UX)
    const maxAge = 60 * 60 * 1000 // 60 minutes
    if (stateAge > maxAge) {
      console.log("❌ [OAuth Callback] State expired")

      // Check if user already has a connection - if so, redirect to success
      if (userId) {
        const userDoc = await db.collection("users").doc(userId).get()
        const userData = userDoc.data()

        if (userData?.stripeAccountId && userData?.stripeConnectionStatus === "verified") {
          console.log("✅ [OAuth Callback] User already has verified connection, redirecting to success")
          const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
          callbackUrl.searchParams.set("success", "true")
          callbackUrl.searchParams.set("recovered", "true")
          return NextResponse.redirect(callbackUrl)
        }
      }

      const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
      callbackUrl.searchParams.set("error", "expired_state")
      callbackUrl.searchParams.set("error_description", "Session expired - please try connecting again")
      return NextResponse.redirect(callbackUrl)
    }

    // Check if state was already used
    if (stateData?.used) {
      console.log("❌ [OAuth Callback] State already used")

      // Check if the connection was successful
      if (userId) {
        const userDoc = await db.collection("users").doc(userId).get()
        const userData = userDoc.data()

        if (userData?.stripeAccountId && userData?.stripeConnectionStatus === "verified") {
          console.log("✅ [OAuth Callback] State was used but connection exists, redirecting to success")
          const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
          callbackUrl.searchParams.set("success", "true")
          callbackUrl.searchParams.set("already_connected", "true")
          return NextResponse.redirect(callbackUrl)
        }
      }

      const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
      callbackUrl.searchParams.set("error", "used_state")
      callbackUrl.searchParams.set("error_description", "Connection already processed")
      return NextResponse.redirect(callbackUrl)
    }

    // Mark state as used immediately
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
    const stripeAccountId = tokenData.stripe_user_id

    console.log("✅ [OAuth Callback] Token exchange successful:", {
      stripe_user_id: stripeAccountId,
      scope: tokenData.scope,
    })

    // 🔥 KEY FIX: Immediately fetch full account status from Stripe
    console.log("🔍 [OAuth Callback] Fetching full account status from Stripe...")
    let stripeAccount
    try {
      stripeAccount = await stripe.accounts.retrieve(stripeAccountId)
      console.log("✅ [OAuth Callback] Stripe account retrieved:", {
        id: stripeAccount.id,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        country: stripeAccount.country,
        business_type: stripeAccount.business_type,
        requirements_currently_due: stripeAccount.requirements?.currently_due?.length || 0,
        requirements_past_due: stripeAccount.requirements?.past_due?.length || 0,
      })
    } catch (stripeError) {
      console.error("❌ [OAuth Callback] Failed to retrieve Stripe account:", stripeError)
      const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
      callbackUrl.searchParams.set("error", "stripe_account_fetch_failed")
      callbackUrl.searchParams.set("error_description", "Failed to verify Stripe account")
      return NextResponse.redirect(callbackUrl)
    }

    // 🔥 KEY FIX: Store comprehensive account status in Firestore
    const now = Date.now()
    const connectionStatus = stripeAccount.charges_enabled && stripeAccount.payouts_enabled ? "verified" : "pending"

    const updateData = {
      // Basic connection info
      stripeAccountId: stripeAccountId,
      stripeAccessToken: tokenData.access_token,
      stripeRefreshToken: tokenData.refresh_token,
      stripeScope: tokenData.scope,
      stripeConnectedAt: now,
      stripeConnectionStatus: connectionStatus,
      lastStripeUpdate: now,

      // Full account status snapshot
      stripeAccountStatus: {
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        country: stripeAccount.country,
        business_type: stripeAccount.business_type,
        disabled_reason: stripeAccount.requirements?.disabled_reason || null,
        requirements: {
          currently_due: stripeAccount.requirements?.currently_due || [],
          past_due: stripeAccount.requirements?.past_due || [],
          eventually_due: stripeAccount.requirements?.eventually_due || [],
          pending_verification: stripeAccount.requirements?.pending_verification || [],
        },
        last_verified: now,
      },
    }

    console.log("🔄 [OAuth Callback] Updating user profile with comprehensive data...")
    await db.collection("users").doc(userId).update(updateData)

    // Verify the update was successful
    const updatedUserDoc = await db.collection("users").doc(userId).get()
    const updatedUserData = updatedUserDoc.data()

    if (!updatedUserData?.stripeAccountId || !updatedUserData?.stripeAccountStatus) {
      console.error("❌ [OAuth Callback] Failed to verify user profile update")
      const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
      callbackUrl.searchParams.set("error", "profile_update_failed")
      callbackUrl.searchParams.set("error_description", "Failed to save Stripe connection")
      return NextResponse.redirect(callbackUrl)
    }

    console.log("✅ [OAuth Callback] User profile updated successfully with status:", connectionStatus)

    // Clean up the used state
    await stateDoc.ref.delete()

    // Redirect to success page
    const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
    callbackUrl.searchParams.set("success", "true")
    callbackUrl.searchParams.set("account_id", stripeAccountId)
    callbackUrl.searchParams.set("status", connectionStatus)
    return NextResponse.redirect(callbackUrl)
  } catch (error) {
    console.error("❌ [OAuth Callback] Processing error:", error)
    const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)
    callbackUrl.searchParams.set("error", "processing_failed")
    callbackUrl.searchParams.set("error_description", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.redirect(callbackUrl)
  }
}
