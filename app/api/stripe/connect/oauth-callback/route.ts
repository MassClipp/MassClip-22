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

    console.log(`🔄 [OAuth Callback] Processing callback with code: ${code ? "present" : "missing"}`)

    // Handle errors from Stripe
    if (error) {
      console.error(`❌ [OAuth Callback] Stripe returned error: ${error}`, errorDescription)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=${error}&error_description=${encodeURIComponent(errorDescription || "Unknown error")}`,
      )
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("❌ [OAuth Callback] Missing required parameters")
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=invalid_request&error_description=Missing+required+parameters`,
      )
    }

    // Parse and validate state parameter
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString())
      if (!stateData.userId || !stateData.timestamp) {
        throw new Error("Invalid state data structure")
      }

      // Check if state is not too old (15 minutes max)
      const stateAge = Date.now() - stateData.timestamp
      if (stateAge > 15 * 60 * 1000) {
        throw new Error("State parameter expired")
      }
    } catch (stateError) {
      console.error("❌ [OAuth Callback] Invalid state parameter:", stateError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=invalid_state&error_description=Invalid+or+expired+state+parameter`,
      )
    }

    console.log(`🔄 [OAuth Callback] Processing for user: ${stateData.userId}`)

    // Exchange authorization code for access token
    let tokenResponse
    try {
      tokenResponse = await stripe.oauth.token({
        grant_type: "authorization_code",
        code,
      })
      console.log(`✅ [OAuth Callback] Successfully exchanged code for token`)
    } catch (tokenError: any) {
      console.error("❌ [OAuth Callback] Failed to exchange code for token:", tokenError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=token_exchange_failed&error_description=${encodeURIComponent(
          tokenError.message || "Failed to exchange authorization code",
        )}`,
      )
    }

    // Get connected account ID and details
    const connectedAccountId = tokenResponse.stripe_user_id
    console.log(`🔄 [OAuth Callback] Connected account ID: ${connectedAccountId}`)

    // Retrieve account details to validate
    let account
    try {
      account = await stripe.accounts.retrieve(connectedAccountId)
      console.log(`✅ [OAuth Callback] Retrieved account details for ${connectedAccountId}`)
    } catch (accountError: any) {
      console.error("❌ [OAuth Callback] Failed to retrieve account:", accountError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=account_retrieval_failed&error_description=${encodeURIComponent(
          accountError.message || "Failed to retrieve account details",
        )}`,
      )
    }

    // Validate account environment matches our platform
    const environmentMismatch = (isTestMode && account.livemode) || (!isTestMode && !account.livemode)
    if (environmentMismatch) {
      console.error(
        `❌ [OAuth Callback] Environment mismatch: Platform is in ${isTestMode ? "test" : "live"} mode but account is in ${account.livemode ? "live" : "test"} mode`,
      )
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=environment_mismatch&error_description=Account+mode+does+not+match+platform+environment`,
      )
    }

    // Prepare account data for storage
    const userId = stateData.userId
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"
    const detailsField = isTestMode ? "stripeTestAccountDetails" : "stripeAccountDetails"

    const accountDetails = {
      id: connectedAccountId,
      country: account.country,
      email: account.email,
      type: account.type,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirementsCurrentlyDue: account.requirements?.currently_due || [],
      requirementsEventuallyDue: account.requirements?.eventually_due || [],
      connectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }

    // Save connection to database
    try {
      await db
        .collection("users")
        .doc(userId)
        .update({
          [accountIdField]: connectedAccountId,
          [connectedField]: true,
          [detailsField]: accountDetails,
          updatedAt: new Date().toISOString(),
        })

      console.log(
        `✅ [OAuth Callback] Successfully saved account ${connectedAccountId} for user ${userId} in ${isTestMode ? "test" : "live"} mode`,
      )
    } catch (firestoreError) {
      console.error("❌ [OAuth Callback] Failed to save to database:", firestoreError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=database_error&error_description=Failed+to+save+connection+to+database`,
      )
    }

    // Check if account needs additional setup
    const needsSetup =
      !account.charges_enabled || !account.payouts_enabled || account.requirements?.currently_due?.length > 0

    if (needsSetup) {
      console.log(`⚠️ [OAuth Callback] Account ${connectedAccountId} needs additional setup`)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?success=true&account=${connectedAccountId}&needs_setup=true`,
      )
    }

    // Success - account is fully set up
    console.log(`🎉 [OAuth Callback] Account ${connectedAccountId} is fully connected and operational`)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?success=true&account=${connectedAccountId}&fully_enabled=true`,
    )
  } catch (error: any) {
    console.error("❌ [OAuth Callback] Unexpected error:", error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=server_error&error_description=${encodeURIComponent(
        error.message || "An unexpected error occurred",
      )}`,
    )
  }
}
