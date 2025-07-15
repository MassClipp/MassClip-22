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

    // For test mode, we need to create an account link to establish the connection
    // This is the missing piece that makes accounts show up in Stripe Dashboard
    try {
      if (isTestMode) {
        console.log(`🔗 [Manual Connect] Creating account link for test account ${accountId}`)

        // Create an account link to establish the connection relationship
        const accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?refresh=true`,
          return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?success=true`,
          type: "account_onboarding",
        })

        console.log(`✅ [Manual Connect] Account link created:`, accountLink.url)
      }

      // For both test and live, we also need to ensure the account is properly associated
      // Check if account needs onboarding completion
      if (!account.details_submitted || !account.charges_enabled) {
        console.log(`⚠️ [Manual Connect] Account ${accountId} needs additional setup`)

        // Create account link for completion
        const accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?refresh=true&account=${accountId}`,
          return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?success=true&account=${accountId}`,
          type: "account_onboarding",
        })

        return NextResponse.json({
          success: true,
          requiresOnboarding: true,
          accountId: account.id,
          onboardingUrl: accountLink.url,
          message: "Account found but requires onboarding completion",
        })
      }
    } catch (linkError: any) {
      console.error("❌ [Manual Connect] Failed to create account link:", linkError)
      // Continue anyway - the account might already be connected
    }

    // Save the connection to Firestore
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = `${accountIdField}Connected`

    try {
      await db
        .collection("users")
        .doc(userId)
        .update({
          [accountIdField]: accountId,
          [connectedField]: new Date().toISOString(),
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
