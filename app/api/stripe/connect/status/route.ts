import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode } from "@/lib/stripe"
import { db, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication token is required",
        },
        { status: 400 },
      )
    }

    // Verify the Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (tokenError) {
      console.error("❌ [Status Check] Token verification failed:", tokenError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired authentication token",
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    console.log(`🔍 [Status Check] Checking connection status for user: ${userId}`)

    // Get user document
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({
        success: true,
        isConnected: false,
        accountId: null,
        mode: isTestMode ? "test" : "live",
        message: "No Stripe account connected",
      })
    }

    const userData = userDoc.data()!
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const accountId = userData[accountIdField]

    if (!accountId) {
      return NextResponse.json({
        success: true,
        isConnected: false,
        accountId: null,
        mode: isTestMode ? "test" : "live",
        message: `No ${isTestMode ? "test" : "live"} Stripe account connected`,
      })
    }

    // Verify the account still exists and is accessible
    try {
      const account = await stripe.accounts.retrieve(accountId)

      const requirements = account.requirements || {}
      const currentlyDue = requirements.currently_due || []
      const pastDue = requirements.past_due || []
      const requirementsCount = currentlyDue.length + pastDue.length

      const isFullyOperational = account.charges_enabled && account.payouts_enabled && account.details_submitted

      return NextResponse.json({
        success: true,
        isConnected: true,
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
          ? "Account fully connected and operational!"
          : "Account connected but may need additional setup.",
      })
    } catch (stripeError: any) {
      console.error("❌ [Status Check] Account no longer accessible:", stripeError)

      // Account is no longer accessible, clear it from user data
      await db
        .collection("users")
        .doc(userId)
        .update({
          [accountIdField]: null,
          [`${accountIdField}Connected`]: null,
        })

      return NextResponse.json({
        success: true,
        isConnected: false,
        accountId: null,
        mode: isTestMode ? "test" : "live",
        message: "Previously connected account is no longer accessible and has been cleared.",
      })
    }
  } catch (error: any) {
    console.error("❌ [Status Check] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check connection status",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
