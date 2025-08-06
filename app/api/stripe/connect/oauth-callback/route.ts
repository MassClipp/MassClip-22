import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID!
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!

interface StripeOAuthResponse {
  stripe_user_id: string
  access_token: string
  refresh_token: string
  token_type: string
  scope: string
  livemode: boolean
  stripe_publishable_key: string
}

interface StripeAccountDetails {
  id: string
  email?: string
  country: string
  default_currency: string
  details_submitted: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  business_type?: string
  type: string
  requirements: {
    currently_due: string[]
    past_due: string[]
    pending_verification: string[]
    eventually_due: string[]
  }
  business_profile?: {
    name?: string
    url?: string
    support_email?: string
  }
}

export async function GET(request: NextRequest) {
  console.log("🔄 [OAuth Callback] Processing Stripe Connect callback")
  
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    console.log("📋 [OAuth Callback] Parameters:", { 
      hasCode: !!code, 
      hasState: !!state, 
      error, 
      errorDescription 
    })

    // Handle Stripe OAuth errors
    if (error) {
      console.error("❌ [OAuth Callback] Stripe OAuth error:", { error, errorDescription })
      const errorUrl = new URL(`${SITE_URL}/dashboard/connect-stripe`)
      errorUrl.searchParams.set("error", error)
      if (errorDescription) {
        errorUrl.searchParams.set("error_description", errorDescription)
      }
      return NextResponse.redirect(errorUrl.toString())
    }

    // Validate required parameters
    if (!code) {
      console.error("❌ [OAuth Callback] Missing authorization code")
      return NextResponse.redirect(`${SITE_URL}/dashboard/connect-stripe?error=missing_code`)
    }

    if (!state) {
      console.error("❌ [OAuth Callback] Missing state parameter")
      return NextResponse.redirect(`${SITE_URL}/dashboard/connect-stripe?error=missing_state`)
    }

    // Parse and validate state (should contain user UID)
    let userUID: string
    try {
      const stateData = JSON.parse(decodeURIComponent(state))
      userUID = stateData.userId || stateData.uid || stateData.userUID
      
      if (!userUID || typeof userUID !== 'string') {
        throw new Error("Invalid user ID in state")
      }
      
      console.log("✅ [OAuth Callback] Parsed user UID from state:", userUID)
    } catch (parseError) {
      console.error("❌ [OAuth Callback] Failed to parse state:", parseError)
      return NextResponse.redirect(`${SITE_URL}/dashboard/connect-stripe?error=invalid_state`)
    }

    // Verify user exists in Firestore
    const userDoc = await adminDb.collection("users").doc(userUID).get()
    if (!userDoc.exists) {
      console.error("❌ [OAuth Callback] User not found:", userUID)
      return NextResponse.redirect(`${SITE_URL}/dashboard/connect-stripe?error=user_not_found`)
    }

    console.log("✅ [OAuth Callback] User verified:", userUID)

    // Exchange authorization code for access token
    console.log("🔄 [OAuth Callback] Exchanging authorization code for tokens")
    
    const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_secret: STRIPE_SECRET_KEY,
        client_id: STRIPE_CLIENT_ID,
        code: code,
        grant_type: "authorization_code",
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("❌ [OAuth Callback] Token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText,
      })
      return NextResponse.redirect(`${SITE_URL}/dashboard/connect-stripe?error=token_exchange_failed`)
    }

    const tokenData: StripeOAuthResponse = await tokenResponse.json()
    console.log("✅ [OAuth Callback] Token exchange successful:", {
      stripeUserId: tokenData.stripe_user_id,
      livemode: tokenData.livemode,
      scope: tokenData.scope,
    })

    // Get detailed account information from Stripe
    console.log("🔄 [OAuth Callback] Fetching account details from Stripe")
    
    const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${tokenData.stripe_user_id}`, {
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      },
    })

    if (!accountResponse.ok) {
      console.error("❌ [OAuth Callback] Failed to fetch account details:", accountResponse.status)
      return NextResponse.redirect(`${SITE_URL}/dashboard/connect-stripe?error=account_fetch_failed`)
    }

    const accountData: StripeAccountDetails = await accountResponse.json()
    console.log("✅ [OAuth Callback] Account details fetched:", {
      accountId: accountData.id,
      email: accountData.email,
      country: accountData.country,
      detailsSubmitted: accountData.details_submitted,
      chargesEnabled: accountData.charges_enabled,
      payoutsEnabled: accountData.payouts_enabled,
    })

    // Prepare the connection data for Firestore
    const connectionData = {
      // OAuth tokens
      stripe_user_id: tokenData.stripe_user_id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
      livemode: tokenData.livemode,
      stripe_publishable_key: tokenData.stripe_publishable_key,
      
      // Account metadata
      email: accountData.email || null,
      country: accountData.country,
      default_currency: accountData.default_currency,
      details_submitted: accountData.details_submitted,
      charges_enabled: accountData.charges_enabled,
      payouts_enabled: accountData.payouts_enabled,
      business_type: accountData.business_type || null,
      account_type: accountData.type,
      
      // Requirements
      requirements: {
        currently_due: accountData.requirements.currently_due || [],
        past_due: accountData.requirements.past_due || [],
        pending_verification: accountData.requirements.pending_verification || [],
        eventually_due: accountData.requirements.eventually_due || [],
      },
      
      // Business profile (if available)
      business_profile: accountData.business_profile ? {
        name: accountData.business_profile.name || null,
        url: accountData.business_profile.url || null,
        support_email: accountData.business_profile.support_email || null,
      } : null,
      
      // Platform metadata
      connected: true,
      userUID: userUID,
      connectedAt: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
    }

    console.log("🔄 [OAuth Callback] Saving connection data to Firestore")

    // Save to connectedStripeAccounts collection
    await adminDb.collection("connectedStripeAccounts").doc(userUID).set(connectionData)

    // Also update the user document for backward compatibility
    await adminDb.collection("users").doc(userUID).update({
      stripeAccountId: tokenData.stripe_user_id,
      stripeConnected: true,
      stripeChargesEnabled: accountData.charges_enabled,
      stripePayoutsEnabled: accountData.payouts_enabled,
      stripeDetailsSubmitted: accountData.details_submitted,
      stripeAccountStatus: accountData.details_submitted && accountData.charges_enabled ? "active" : "pending",
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log("✅ [OAuth Callback] Connection data saved successfully")

    // Determine redirect based on account status
    const isFullySetup = accountData.details_submitted && 
                        accountData.charges_enabled && 
                        accountData.payouts_enabled &&
                        accountData.requirements.currently_due.length === 0 &&
                        accountData.requirements.past_due.length === 0

    const successUrl = new URL(`${SITE_URL}/dashboard/connect-stripe/callback`)
    successUrl.searchParams.set("success", "true")
    successUrl.searchParams.set("account_id", tokenData.stripe_user_id)
    successUrl.searchParams.set("charges_enabled", accountData.charges_enabled.toString())
    successUrl.searchParams.set("payouts_enabled", accountData.payouts_enabled.toString())
    successUrl.searchParams.set("details_submitted", accountData.details_submitted.toString())
    successUrl.searchParams.set("fully_setup", isFullySetup.toString())

    if (accountData.requirements.currently_due.length > 0 || accountData.requirements.past_due.length > 0) {
      successUrl.searchParams.set("action_required", "true")
    }

    console.log("🔄 [OAuth Callback] Redirecting to success page:", successUrl.toString())
    return NextResponse.redirect(successUrl.toString())

  } catch (error) {
    console.error("❌ [OAuth Callback] Unexpected error:", error)
    
    const errorUrl = new URL(`${SITE_URL}/dashboard/connect-stripe`)
    errorUrl.searchParams.set("error", "unexpected_error")
    errorUrl.searchParams.set("error_description", error instanceof Error ? error.message : "An unexpected error occurred")
    
    return NextResponse.redirect(errorUrl.toString())
  }
}
