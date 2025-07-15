import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode } from "@/lib/stripe"
import { db, auth } from "@/lib/firebase-admin"

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
      `🔗 [Manual Connect] Connecting account ${accountId} for user ${userId} in ${isTestMode ? "TEST" : "LIVE"} mode`,
    )

    // Retrieve and validate the account from Stripe
    let account
    try {
      account = await stripe.accounts.retrieve(accountId)
      console.log(`✅ [Manual Connect] Account retrieved:`, {
        id: account.id,
        type: account.type,
        country: account.country,
        livemode: account.livemode,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      })
    } catch (stripeError: any) {
      console.error("❌ [Manual Connect] Failed to retrieve account:", stripeError)

      if (stripeError.code === "resource_missing") {
        return NextResponse.json(
          {
            success: false,
            error: "Account not found. Please verify the account ID is correct.",
          },
          { status: 404 },
        )
      }

      if (stripeError.code === "permission_denied") {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot access this account. Make sure it's accessible from your platform.",
          },
          { status: 403 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: `Stripe API error: ${stripeError.message}`,
        },
        { status: 400 },
      )
    }

    // Check if account mode matches our environment
    const environmentMismatch = (isTestMode && account.livemode) || (!isTestMode && !account.livemode)

    if (environmentMismatch) {
      const expectedMode = isTestMode ? "test" : "live"
      const actualMode = account.livemode ? "live" : "test"
      return NextResponse.json(
        {
          success: false,
          error: `Environment mismatch: Cannot connect ${actualMode} mode account in ${expectedMode} environment.`,
        },
        { status: 400 },
      )
    }

    // Check if account is ready for transactions
    if (!account.details_submitted) {
      return NextResponse.json(
        {
          success: false,
          error: "Account setup is incomplete. Please complete your Stripe account setup first.",
        },
        { status: 400 },
      )
    }

    // Determine which field to update based on mode
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"

    // Save the account ID to the user's Firestore document
    try {
      await db
        .collection("users")
        .doc(userId)
        .update({
          [accountIdField]: account.id,
          [connectedField]: true,
          [`${accountIdField}ConnectedAt`]: new Date(),
          [`${accountIdField}Country`]: account.country,
          [`${accountIdField}Email`]: account.email,
          [`${accountIdField}Type`]: account.type,
        })

      console.log(`✅ [Manual Connect] Account ${account.id} connected to user ${userId}`)
    } catch (firestoreError) {
      console.error("❌ [Manual Connect] Failed to save to Firestore:", firestoreError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save connection to database",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      accountConnected: true,
      accountId: account.id,
      mode: isTestMode ? "test" : "live",
      message: `${isTestMode ? "Test" : "Live"} account connected successfully`,
      accountDetails: {
        id: account.id,
        email: account.email,
        country: account.country,
        type: account.type,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      },
    })
  } catch (error: any) {
    console.error("❌ [Manual Connect] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during connection",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
