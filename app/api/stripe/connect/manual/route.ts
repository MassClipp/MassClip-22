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
      return NextResponse.json({
        success: false,
        error: "Invalid account ID format. Must start with 'acct_'",
      })
    }

    console.log(`🔗 [Manual Connect] Connecting account ${accountId} for user ${userId}`)

    try {
      // First, verify the account exists and is accessible
      const account = await stripe.accounts.retrieve(accountId)

      // Check if account mode matches our environment
      const environmentMismatch = (isTestMode && account.livemode) || (!isTestMode && !account.livemode)

      if (environmentMismatch) {
        const expectedMode = isTestMode ? "test" : "live"
        const actualMode = account.livemode ? "live" : "test"
        return NextResponse.json({
          success: false,
          error: `Cannot connect ${actualMode} mode account in ${expectedMode} environment`,
          account_mode: actualMode,
          expected_mode: expectedMode,
        })
      }

      // Update account metadata to mark it as connected to MassClip
      const updatedAccount = await stripe.accounts.update(accountId, {
        metadata: {
          ...account.metadata,
          connected_to_platform: "massclip",
          connected_by_user: userId,
          connected_at: new Date().toISOString(),
          connection_method: "manual",
          platform_environment: isTestMode ? "test" : "live",
        },
      })

      console.log(`✅ [Manual Connect] Updated account metadata for ${accountId}`)

      // Save connection to Firestore
      const connectionData = {
        [isTestMode ? "stripeTestAccountId" : "stripeAccountId"]: accountId,
        [isTestMode ? "stripeTestConnected" : "stripeConnected"]: true,
        [isTestMode ? "stripeTestConnectedAt" : "stripeConnectedAt"]: new Date().toISOString(),
        [isTestMode ? "stripeTestAccountType" : "stripeAccountType"]: account.type,
        [isTestMode ? "stripeTestAccountEmail" : "stripeAccountEmail"]: account.email,
        [isTestMode ? "stripeTestAccountCountry" : "stripeAccountCountry"]: account.country,
        updatedAt: new Date().toISOString(),
      }

      await db.collection("users").doc(userId).set(connectionData, { merge: true })

      console.log(`💾 [Manual Connect] Saved connection to Firestore for user ${userId}`)

      return NextResponse.json({
        success: true,
        connected: true,
        accountId: accountId,
        message: `Account ${accountId} successfully connected to MassClip platform`,
        account_details: {
          id: updatedAccount.id,
          type: updatedAccount.type,
          email: updatedAccount.email,
          country: updatedAccount.country,
          charges_enabled: updatedAccount.charges_enabled,
          payouts_enabled: updatedAccount.payouts_enabled,
          details_submitted: updatedAccount.details_submitted,
          livemode: updatedAccount.livemode,
        },
        connection_info: {
          user_id: userId,
          connected_at: new Date().toISOString(),
          environment: isTestMode ? "test" : "live",
          method: "manual",
        },
        next_steps: updatedAccount.details_submitted
          ? ["Account is ready for transactions"]
          : ["Complete account onboarding in Stripe Dashboard", "Submit required business information"],
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
        error: "Failed to connect account",
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
