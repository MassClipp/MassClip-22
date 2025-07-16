import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe, isTestMode, isLiveMode } from "@/lib/stripe"

interface StatusBody {
  idToken: string
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as StatusBody

    if (!idToken) {
      return NextResponse.json({
        success: true,
        isConnected: false,
        accountId: null,
        mode: isLiveMode ? "live" : "test",
        environment: process.env.NODE_ENV,
        message: "User not authenticated",
      })
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log(`✅ [Status] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [Status] Token verification failed:", tokenError)
      return NextResponse.json({
        success: true,
        isConnected: false,
        accountId: null,
        mode: isLiveMode ? "live" : "test",
        environment: process.env.NODE_ENV,
        message: "Invalid authentication token",
      })
    }

    const userId = decodedToken.uid

    // Get user document from Firestore
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.log(`❌ [Status] User profile not found for ${userId}`)
      return NextResponse.json({
        success: true,
        isConnected: false,
        accountId: null,
        mode: isLiveMode ? "live" : "test",
        environment: process.env.NODE_ENV,
        message: "User profile not found",
      })
    }

    const userData = userDoc.data()!

    // In production/live mode, use live account fields
    // In development/test mode, use test account fields
    const accountIdField = isLiveMode ? "stripeAccountId" : "stripeTestAccountId"
    const connectedField = isLiveMode ? "stripeConnected" : "stripeTestConnected"
    const connectedAccountId = userData[accountIdField]
    const isConnectedFlag = userData[connectedField]

    console.log(`🔍 [Status] Checking connection for user ${userId}:`, {
      mode: isLiveMode ? "live" : "test",
      environment: process.env.NODE_ENV,
      accountIdField,
      connectedField,
      accountId: connectedAccountId,
      isConnected: isConnectedFlag,
    })

    if (!connectedAccountId) {
      return NextResponse.json({
        success: true,
        isConnected: false,
        accountId: null,
        mode: isLiveMode ? "live" : "test",
        environment: process.env.NODE_ENV,
        message: `No ${isLiveMode ? "live" : "test"} Stripe account connected`,
        debug: {
          userId,
          checkedField: accountIdField,
          availableFields: Object.keys(userData),
        },
      })
    }

    // Verify the account still exists and is accessible in Stripe
    try {
      const account = await stripe.accounts.retrieve(connectedAccountId)
      console.log(`✅ [Status] Connected account verified: ${account.id}`)

      // Verify account mode matches our environment
      const accountIsLive = account.livemode
      if (isLiveMode && !accountIsLive) {
        console.warn(`⚠️ [Status] Environment mismatch: Using live keys but account is in test mode`)
      }
      if (isTestMode && accountIsLive) {
        console.warn(`⚠️ [Status] Environment mismatch: Using test keys but account is in live mode`)
      }

      return NextResponse.json({
        success: true,
        isConnected: true,
        accountId: account.id,
        mode: isLiveMode ? "live" : "test",
        environment: process.env.NODE_ENV,
        accountStatus: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          country: account.country,
          email: account.email,
          type: account.type,
          livemode: account.livemode,
        },
        message: `${isLiveMode ? "Live" : "Test"} Stripe account connected and operational`,
        debug: {
          userId,
          checkedField: accountIdField,
          foundAccountId: connectedAccountId,
          stripeVerified: true,
          environmentMatch: (isLiveMode && accountIsLive) || (isTestMode && !accountIsLive),
        },
      })
    } catch (stripeError: any) {
      console.error("❌ [Status] Failed to verify connected account:", stripeError)
      return NextResponse.json({
        success: true,
        isConnected: false,
        accountId: connectedAccountId,
        mode: isLiveMode ? "live" : "test",
        environment: process.env.NODE_ENV,
        message: "Connected account is no longer accessible",
        error: stripeError.message,
        debug: {
          userId,
          storedAccountId: connectedAccountId,
          stripeError: stripeError.code,
        },
      })
    }
  } catch (error: any) {
    console.error("❌ [Status] Unexpected error:", error)
    return NextResponse.json({
      success: false,
      isConnected: false,
      accountId: null,
      mode: isLiveMode ? "live" : "test",
      environment: process.env.NODE_ENV,
      message: "Failed to check connection status",
      error: error.message,
    })
  }
}

// Add GET method for status checking without authentication
export async function GET(request: NextRequest) {
  return NextResponse.json({
    mode: isLiveMode ? "live" : "test",
    environment: process.env.NODE_ENV,
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY_LIVE || !!process.env.STRIPE_SECRET_KEY,
    message: `Stripe is configured in ${isLiveMode ? "LIVE" : "TEST"} mode`,
  })
}
