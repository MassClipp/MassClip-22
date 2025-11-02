import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    console.log("🔄 [OAuth Callback] Processing Stripe Connect callback")
    console.log("- Code present:", !!code)
    console.log("- State:", state)
    console.log("- Error:", error)

    // Handle OAuth errors from Stripe
    if (error) {
      console.error("❌ [OAuth Callback] Stripe OAuth error:", error, errorDescription)
      const errorMessage = errorDescription || error
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=${encodeURIComponent(errorMessage)}`
      )
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("❌ [OAuth Callback] Missing required parameters")
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=missing_parameters`
      )
    }

    // Validate and extract user ID from state
    let userId: string
    try {
      // State should be the user UID (we'll encode it as JSON for future extensibility)
      const stateData = JSON.parse(decodeURIComponent(state))
      userId = stateData.userId || stateData.uid || state // Support multiple formats
      
      if (!userId || typeof userId !== 'string') {
        throw new Error("Invalid user ID in state")
      }
    } catch (parseError) {
      console.error("❌ [OAuth Callback] Invalid state parameter:", parseError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=invalid_state`
      )
    }

    console.log(`🔄 [OAuth Callback] Processing for user: ${userId}`)

    // Verify user exists in our system
    try {
      const userDoc = await adminDb.collection("users").doc(userId).get()
      if (!userDoc.exists) {
        console.error(`❌ [OAuth Callback] User ${userId} not found`)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=user_not_found`
        )
      }
    } catch (userError) {
      console.error("❌ [OAuth Callback] Error verifying user:", userError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=user_verification_failed`
      )
    }

    // Exchange authorization code for access token
    console.log("🔄 [OAuth Callback] Exchanging code for access token...")
    
    const clientSecret = process.env.STRIPE_SECRET_KEY
    if (!clientSecret) {
      console.error("❌ [OAuth Callback] Missing STRIPE_SECRET_KEY")
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=server_configuration_error`
      )
    }

    const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_secret: clientSecret,
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
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=token_exchange_failed`
      )
    }

    const tokenData = await tokenResponse.json()
    console.log("✅ [OAuth Callback] Token exchange successful")

    // Validate token response
    if (!tokenData.stripe_user_id || !tokenData.access_token) {
      console.error("❌ [OAuth Callback] Invalid token response:", tokenData)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=invalid_token_response`
      )
    }

    // Get account details from Stripe
    console.log("🔄 [OAuth Callback] Fetching account details from Stripe...")
    
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
    let accountDetails
    
    try {
      accountDetails = await stripe.accounts.retrieve(tokenData.stripe_user_id)
      console.log("✅ [OAuth Callback] Account details retrieved")
    } catch (stripeError: any) {
      console.error("❌ [OAuth Callback] Failed to retrieve account details:", stripeError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=account_details_failed`
      )
    }

    // Prepare the document data for Firestore
    const now = new Date()
    const connectedAccountData = {
      // OAuth tokens and metadata
      stripe_user_id: tokenData.stripe_user_id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      livemode: tokenData.livemode || false,
      scope: tokenData.scope || "read_write",
      
      // Account status and capabilities
      charges_enabled: accountDetails.charges_enabled || false,
      payouts_enabled: accountDetails.payouts_enabled || false,
      details_submitted: accountDetails.details_submitted || false,
      
      // Account metadata
      country: accountDetails.country || null,
      email: accountDetails.email || null,
      business_type: accountDetails.business_type || null,
      type: accountDetails.type || null,
      default_currency: accountDetails.default_currency || "usd",
      
      // Platform metadata
      userId: userId,
      connected: true,
      connectedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      
      // Additional useful metadata
      business_profile: accountDetails.business_profile ? {
        name: accountDetails.business_profile.name || null,
        url: accountDetails.business_profile.url || null,
        support_email: accountDetails.business_profile.support_email || null,
      } : null,
      
      requirements: accountDetails.requirements ? {
        currently_due: accountDetails.requirements.currently_due || [],
        past_due: accountDetails.requirements.past_due || [],
        pending_verification: accountDetails.requirements.pending_verification || [],
        eventually_due: accountDetails.requirements.eventually_due || [],
      } : null,
      
      // Store the full account object for reference (sanitized)
      stripe_account_data: {
        id: accountDetails.id,
        object: accountDetails.object,
        business_type: accountDetails.business_type,
        capabilities: accountDetails.capabilities,
        charges_enabled: accountDetails.charges_enabled,
        country: accountDetails.country,
        created: accountDetails.created,
        default_currency: accountDetails.default_currency,
        details_submitted: accountDetails.details_submitted,
        email: accountDetails.email,
        payouts_enabled: accountDetails.payouts_enabled,
        type: accountDetails.type,
      },
    }

    // Save to connectedStripeAccounts collection
    console.log("🔄 [OAuth Callback] Saving to connectedStripeAccounts collection...")
    
    try {
      const docRef = adminDb.collection("connectedStripeAccounts").doc(userId)
      await docRef.set(connectedAccountData, { merge: true })
      console.log(`✅ [OAuth Callback] Successfully saved connected account for user: ${userId}`)
    } catch (firestoreError) {
      console.error("❌ [OAuth Callback] Failed to save to Firestore:", firestoreError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=database_save_failed`
      )
    }

    // Success! Redirect to earnings page
    console.log(`✅ [OAuth Callback] OAuth flow completed successfully for user: ${userId}`)
    console.log(`- Account ID: ${tokenData.stripe_user_id}`)
    console.log(`- Charges Enabled: ${accountDetails.charges_enabled}`)
    console.log(`- Details Submitted: ${accountDetails.details_submitted}`)

    const successUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings`)
    successUrl.searchParams.set("onboarding", "success")
    successUrl.searchParams.set("account_id", tokenData.stripe_user_id)
    
    return NextResponse.redirect(successUrl.toString())

  } catch (error) {
    console.error("❌ [OAuth Callback] Unexpected error:", error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=unexpected_error`
    )
  }
}
