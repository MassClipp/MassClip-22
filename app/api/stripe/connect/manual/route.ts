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
      `🔗 [Manual Connect] Connecting account ${accountId} for user ${userId} in ${isTestMode ? "TEST" : "LIVE"} mode`,
    )

    // First, validate the account exists and is accessible
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
      return NextResponse.json(
        {
          success: false,
          error: "Account not found or not accessible",
          details: stripeError.message,
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
          error: `Cannot connect ${actualMode} mode account in ${expectedMode} environment`,
        },
        { status: 400 },
      )
    }

    // Update the account metadata to mark it as connected to our platform
    try {
      await stripe.accounts.update(accountId, {
        metadata: {
          platform_connected: "true",
          platform_connected_at: new Date().toISOString(),
          platform_user_id: userId,
          platform_environment: isTestMode ? "test" : "live",
          massclip_connected: "true",
        },
      })
      console.log(`✅ [Manual Connect] Account metadata updated`)
    } catch (metadataError) {
      console.warn(`⚠️ [Manual Connect] Could not update account metadata:`, metadataError)
      // Continue anyway - metadata update is not critical
    }

    // Save the connection to Firestore - THIS IS THE KEY PART
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"
    const connectedAtField = isTestMode ? "stripeTestConnectedAt" : "stripeConnectedAt"
    const detailsField = isTestMode ? "stripeTestAccountDetails" : "stripeAccountDetails"

    try {
      const userRef = db.collection("users").doc(userId)

      // Get current user data to preserve existing fields
      const userDoc = await userRef.get()
      const existingData = userDoc.exists ? userDoc.data() : {}

      const updateData = {
        ...existingData,
        [accountIdField]: accountId,
        [connectedField]: true,
        [connectedAtField]: new Date().toISOString(),
        [detailsField]: {
          country: account.country,
          email: account.email,
          type: account.type,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          livemode: account.livemode,
        },
        updatedAt: new Date().toISOString(),
      }

      await userRef.set(updateData, { merge: true })

      console.log(`✅ [Manual Connect] Account ${accountId} connected and saved to Firestore for user ${userId}`)
      console.log(`📝 [Manual Connect] Saved fields:`, {
        [accountIdField]: accountId,
        [connectedField]: true,
        [connectedAtField]: updateData[connectedAtField],
      })
    } catch (firestoreError) {
      console.error("❌ [Manual Connect] Failed to save to Firestore:", firestoreError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save connection to database",
          details: firestoreError instanceof Error ? firestoreError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    // Return success response
    return NextResponse.json({
      success: true,
      accountConnected: true,
      accountId: account.id,
      mode: isTestMode ? "test" : "live",
      message: `${isTestMode ? "Test" : "Live"} Stripe account connected successfully`,
      accountDetails: {
        country: account.country,
        email: account.email,
        type: account.type,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        livemode: account.livemode,
      },
      debug: {
        userId,
        savedFields: {
          [accountIdField]: accountId,
          [connectedField]: true,
        },
        environment: isTestMode ? "test" : "live",
      },
    })
  } catch (error: any) {
    console.error("❌ [Manual Connect] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect account",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
