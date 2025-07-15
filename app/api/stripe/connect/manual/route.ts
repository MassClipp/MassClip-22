import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

interface ManualConnectBody {
  idToken: string
  accountId: string
}

export async function POST(request: NextRequest) {
  try {
    const { idToken, accountId } = (await request.json()) as ManualConnectBody

    if (!idToken || !accountId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication token and account ID are required",
        },
        { status: 400 },
      )
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log(`✅ [Manual Connect] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [Manual Connect] Token verification failed:", tokenError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired authentication token",
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid

    // Validate account ID format
    if (!accountId.startsWith("acct_")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid account ID format. Must start with 'acct_'",
        },
        { status: 400 },
      )
    }

    console.log(
      `🔗 [Manual Connect] Connecting account ${accountId} to user ${userId} in ${isTestMode ? "TEST" : "LIVE"} mode`,
    )

    try {
      // Verify the account exists and get its details
      const account = await stripe.accounts.retrieve(accountId)

      // Check if account mode matches our environment
      const environmentMismatch = (isTestMode && account.livemode) || (!isTestMode && !account.livemode)

      if (environmentMismatch) {
        const expectedMode = isTestMode ? "test" : "live"
        const actualMode = account.livemode ? "live" : "test"
        return NextResponse.json({
          success: false,
          error: `Cannot connect ${actualMode} mode account in ${expectedMode} environment`,
          account_details: {
            id: account.id,
            livemode: account.livemode,
            expected_mode: expectedMode,
          },
        })
      }

      console.log(`✅ [Manual Connect] Account verified:`, {
        id: account.id,
        type: account.type,
        email: account.email,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      })

      // Update account metadata to mark it as connected to our platform
      try {
        await stripe.accounts.update(accountId, {
          metadata: {
            platform_connected: "true",
            platform_connected_at: new Date().toISOString(),
            platform_user_id: userId,
            platform_environment: isTestMode ? "test" : "live",
            created_by_platform: "massclip",
            firebase_uid: userId,
          },
        })
        console.log(`✅ [Manual Connect] Account metadata updated`)
      } catch (metadataError) {
        console.warn(`⚠️ [Manual Connect] Could not update account metadata:`, metadataError)
        // Continue anyway - metadata update is not critical for basic functionality
      }

      // Determine which fields to update based on mode
      const updateData = isTestMode
        ? {
            stripeTestAccountId: accountId,
            stripeTestConnected: true,
            stripeTestConnectedAt: new Date().toISOString(),
            stripeTestAccountType: account.type,
            stripeTestAccountEmail: account.email,
            stripeTestAccountCountry: account.country,
            updatedAt: new Date().toISOString(),
          }
        : {
            stripeAccountId: accountId,
            stripeConnected: true,
            stripeConnectedAt: new Date().toISOString(),
            stripeAccountType: account.type,
            stripeAccountEmail: account.email,
            stripeAccountCountry: account.country,
            updatedAt: new Date().toISOString(),
          }

      // Save the connection to Firestore
      await db.collection("users").doc(userId).set(updateData, { merge: true })

      console.log(`💾 [Manual Connect] Saved connection to Firestore:`, {
        userId,
        accountId,
        mode: isTestMode ? "test" : "live",
        fields: Object.keys(updateData),
      })

      return NextResponse.json({
        success: true,
        accountId,
        mode: isTestMode ? "test" : "live",
        message: `Successfully connected ${isTestMode ? "test" : "live"} account to MassClip`,
        account_details: {
          id: account.id,
          type: account.type,
          email: account.email,
          country: account.country,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        },
        connection_info: {
          connected_at: new Date().toISOString(),
          user_id: userId,
          environment: isTestMode ? "test" : "live",
          platform_account: "acct_1RFLa9Dheyb0pkWF",
        },
      })
    } catch (stripeError: any) {
      console.error("❌ [Manual Connect] Stripe error:", stripeError)

      if (stripeError.code === "resource_missing") {
        return NextResponse.json({
          success: false,
          error: `Account ${accountId} not found in ${isTestMode ? "test" : "live"} mode`,
          details: stripeError.message,
        })
      }

      return NextResponse.json({
        success: false,
        error: "Failed to verify account with Stripe",
        details: stripeError.message,
        stripe_error_code: stripeError.code,
      })
    }
  } catch (error: any) {
    console.error("❌ [Manual Connect] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during manual connection",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
