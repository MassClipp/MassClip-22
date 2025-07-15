import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode } from "@/lib/stripe"
import { db, auth } from "@/lib/firebase-admin"

interface ConnectBody {
  accountId: string
  idToken: string
}

export async function POST(request: NextRequest) {
  try {
    const { idToken, accountId } = (await request.json()) as ConnectBody

    if (!accountId || !idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Both accountId and idToken are required",
        },
        { status: 400 },
      )
    }

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

    // Verify the Firebase ID token
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
    console.log(
      `🔗 [Manual Connect] Connecting account ${accountId} for user: ${userId} in ${isTestMode ? "TEST" : "LIVE"} mode`,
    )

    // Verify the account exists and is accessible
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
      })
    } catch (stripeError: any) {
      console.error("❌ [Manual Connect] Failed to retrieve account:", stripeError)

      if (stripeError.code === "resource_missing") {
        return NextResponse.json(
          {
            success: false,
            error: "Account not found. Please check the account ID.",
          },
          { status: 404 },
        )
      }

      if (stripeError.code === "permission_denied") {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot access this account. Ensure it's accessible from your platform.",
          },
          { status: 403 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to verify account with Stripe",
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
          error: `Cannot connect ${actualMode} mode account in ${expectedMode} environment.`,
        },
        { status: 400 },
      )
    }

    // Check if account is already connected to another user
    const fieldToCheck = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const existingUserQuery = await db.collection("users").where(fieldToCheck, "==", accountId).get()

    if (!existingUserQuery.empty) {
      const existingUser = existingUserQuery.docs[0]
      if (existingUser.id !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: "This account is already connected to another user.",
          },
          { status: 409 },
        )
      }
      // Account is already connected to this user
      console.log(`ℹ️ [Manual Connect] Account ${accountId} already connected to user ${userId}`)
    }

    // Get or create user document
    const userDocRef = db.collection("users").doc(userId)
    const userDoc = await userDocRef.get()

    if (!userDoc.exists) {
      // Create user document if it doesn't exist
      await userDocRef.set({
        uid: userId,
        email: decodedToken.email,
        createdAt: new Date(),
      })
      console.log(`📝 [Manual Connect] Created user document for ${userId}`)
    }

    // Update user document with the connected account
    const updateData = isTestMode
      ? {
          stripeTestAccountId: accountId,
          stripeTestAccountConnected: new Date(),
          stripeTestAccountManuallyConnected: true,
          // Also update the primary account ID field for test mode
          stripeAccountId: accountId,
          stripeAccountConnected: new Date(),
          lastUpdated: new Date(),
        }
      : {
          stripeAccountId: accountId,
          stripeAccountConnected: new Date(),
          stripeAccountManuallyConnected: true,
          lastUpdated: new Date(),
        }

    await userDocRef.update(updateData)

    console.log(`✅ [Manual Connect] Successfully connected account ${accountId} to user ${userId}`)

    // Check requirements and account status
    const requirements = account.requirements || {}
    const currentlyDue = requirements.currently_due || []
    const pastDue = requirements.past_due || []
    const requirementsCount = currentlyDue.length + pastDue.length

    const isFullyOperational = account.charges_enabled && account.payouts_enabled && account.details_submitted

    return NextResponse.json({
      success: true,
      accountConnected: true,
      accountId: account.id,
      mode: isTestMode ? "test" : "live",
      accountStatus: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirementsCount,
        currentlyDue,
        pastDue,
        country: account.country,
        email: account.email,
        type: account.type,
        livemode: account.livemode,
        fullyOperational: isFullyOperational,
      },
      message: isFullyOperational
        ? "Account successfully connected and fully operational!"
        : "Account connected but may require additional setup to process payments.",
      debugInfo: {
        userId,
        fieldUpdated: fieldToCheck,
        environmentMode: isTestMode ? "test" : "live",
        accountMode: account.livemode ? "live" : "test",
      },
    })
  } catch (error: any) {
    console.error("❌ [Manual Connect] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect account due to internal error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
