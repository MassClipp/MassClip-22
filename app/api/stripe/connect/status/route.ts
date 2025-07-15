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
    const connectedAccountId = userData[accountIdField]

    if (!connectedAccountId) {
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
        },
        message: `${isTestMode ? "Test" : "Live"} Stripe account connected and operational`,
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
