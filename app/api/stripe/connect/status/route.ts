import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

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
        mode: isTestMode ? "test" : "live",
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
        mode: isTestMode ? "test" : "live",
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
        mode: isTestMode ? "test" : "live",
        message: "User profile not found",
      })
    }

    const userData = userDoc.data()!
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"
    const connectedAccountId = userData[accountIdField]
    const isConnectedFlag = userData[connectedField]

    console.log(`🔍 [Status] Checking connection for user ${userId}:`, {
      mode: isTestMode ? "test" : "live",
      accountIdField,
      connectedField,
      accountId: connectedAccountId,
      isConnected: isConnectedFlag,
      allUserData: Object.keys(userData),
    })

    if (!connectedAccountId) {
      return NextResponse.json({
        success: true,
        isConnected: false,
        accountId: null,
        mode: isTestMode ? "test" : "live",
        message: `No ${isTestMode ? "test" : "live"} Stripe account connected`,
        debug: {
          userId,
          checkedField: accountIdField,
          availableFields: Object.keys(userData),
          userData: userData,
        },
      })
    }

    // Verify the account still exists and is accessible in Stripe
    try {
      const account = await stripe.accounts.retrieve(connectedAccountId)
      console.log(`✅ [Status] Connected account verified: ${account.id}`)

      return NextResponse.json({
        success: true,
        isConnected: true,
        accountId: account.id,
        mode: isTestMode ? "test" : "live",
        accountStatus: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          country: account.country,
          email: account.email,
          type: account.type,
          livemode: account.livemode,
        },
        message: `${isTestMode ? "Test" : "Live"} Stripe account connected and operational`,
        debug: {
          userId,
          checkedField: accountIdField,
          foundAccountId: connectedAccountId,
          stripeVerified: true,
        },
      })
    } catch (stripeError: any) {
      console.error("❌ [Status] Failed to verify connected account:", stripeError)
      return NextResponse.json({
        success: true,
        isConnected: false,
        accountId: connectedAccountId,
        mode: isTestMode ? "test" : "live",
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
      mode: isTestMode ? "test" : "live",
      message: "Failed to check connection status",
      error: error.message,
    })
  }
}
