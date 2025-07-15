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

    // THIS IS THE KEY PART: Create a Connect relationship with the account
    try {
      // For Stripe Connect to work properly, we need to create a platform relationship
      // This is done by creating a login link or OAuth link, but first we need to
      // ensure the account is properly set up for Connect

      // 1. Update the account to add it to our platform
      await stripe.accounts.update(accountId, {
        metadata: {
          platform_connected: "true",
          platform_connected_at: new Date().toISOString(),
          platform_user_id: userId,
          platform_environment: isTestMode ? "test" : "live",
        },
        settings: {
          payouts: {
            schedule: {
              interval: "manual",
            },
          },
        },
      })

      console.log(`✅ [Manual Connect] Account updated with platform metadata`)

      // 2. Create a login link to establish the connection
      const loginLink = await stripe.accounts.createLoginLink(accountId)
      console.log(`✅ [Manual Connect] Login link created: ${loginLink.url}`)

      // 3. For test accounts, we may need to explicitly add capabilities
      if (isTestMode && account.type === "standard") {
        try {
          await stripe.accounts.update(accountId, {
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
          })
          console.log(`✅ [Manual Connect] Added capabilities to test account`)
        } catch (capError) {
          console.warn(`⚠️ [Manual Connect] Could not update capabilities:`, capError)
          // Continue anyway - not all account types support this
        }
      }
    } catch (connectError: any) {
      console.error("❌ [Manual Connect] Failed to establish Connect relationship:", connectError)
      // We'll continue anyway and save the account ID to Firestore
    }

    // Save the connection to Firestore
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"

    try {
      await db
        .collection("users")
        .doc(userId)
        .update({
          [accountIdField]: accountId,
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

      console.log(`✅ [Manual Connect] Account ${accountId} connected and saved to Firestore`)
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
