import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const error = url.searchParams.get("error")
    const errorDescription = url.searchParams.get("error_description")

    // Handle errors from Stripe
    if (error) {
      console.error(`❌ [OAuth Callback] Stripe returned error: ${error}`, errorDescription)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?error=${error}&error_description=${errorDescription}`,
      )
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("❌ [OAuth Callback] Missing required parameters")
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?error=invalid_request&error_description=Missing+required+parameters`,
      )
    }

    // Parse state parameter
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString())
      if (!stateData.userId || !stateData.timestamp) {
        throw new Error("Invalid state data")
      }
    } catch (stateError) {
      console.error("❌ [OAuth Callback] Invalid state parameter:", stateError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?error=invalid_state&error_description=Invalid+state+parameter`,
      )
    }

    // Exchange authorization code for access token
    let tokenResponse
    try {
      tokenResponse = await stripe.oauth.token({
        grant_type: "authorization_code",
        code,
      })
    } catch (tokenError: any) {
      console.error("❌ [OAuth Callback] Failed to exchange code for token:", tokenError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?error=token_exchange_failed&error_description=${encodeURIComponent(
          tokenError.message,
        )}`,
      )
    }

    // Get connected account ID and details
    const connectedAccountId = tokenResponse.stripe_user_id

    // Retrieve account details
    let account
    try {
      account = await stripe.accounts.retrieve(connectedAccountId)
    } catch (accountError: any) {
      console.error("❌ [OAuth Callback] Failed to retrieve account:", accountError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?error=account_retrieval_failed&error_description=${encodeURIComponent(
          accountError.message,
        )}`,
      )
    }

    // Check if account mode matches our environment
    const environmentMismatch = (isTestMode && account.livemode) || (!isTestMode && !account.livemode)
    if (environmentMismatch) {
      console.error(
        `❌ [OAuth Callback] Environment mismatch: ${isTestMode ? "test" : "live"} vs ${account.livemode ? "live" : "test"}`,
      )
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?error=environment_mismatch&error_description=Account+mode+does+not+match+platform+mode`,
      )
    }

    // Save connection to Firestore
    const userId = stateData.userId
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"

    try {
      await db
        .collection("users")
        .doc(userId)
        .update({
          [accountIdField]: connectedAccountId,
          [connectedField]: true,
          [`${accountIdField}ConnectedAt`]: new Date().toISOString(),
          [`${accountIdField}Details`]: {
            country: account.country,
            email: account.email,
            type: account.type,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
          },
          updatedAt: new Date().toISOString(),
        })

      console.log(
        `✅ [OAuth Callback] Account ${connectedAccountId} connected and saved to Firestore for user ${userId}`,
      )
    } catch (firestoreError) {
      console.error("❌ [OAuth Callback] Failed to save to Firestore:", firestoreError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?error=database_error&error_description=Failed+to+save+connection`,
      )
    }

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?success=true&account=${connectedAccountId}`,
    )
  } catch (error: any) {
    console.error("❌ [OAuth Callback] Unexpected error:", error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?error=server_error&error_description=${encodeURIComponent(
        error.message,
      )}`,
    )
  }
}
