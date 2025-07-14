import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode } from "@/lib/stripe"
import { db, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify the Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log(`✅ [Stripe Status] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [Stripe Status] Token verification failed:", tokenError)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`🔍 [Stripe Status] Checking connection for user: ${userId} (${isTestMode ? "TEST" : "LIVE"} mode)`)

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()!

    // Get the appropriate account ID based on mode
    const accountId = isTestMode ? userData.stripeTestAccountId : userData.stripeAccountId

    if (!accountId) {
      console.log(`❌ [Stripe Status] No ${isTestMode ? "test" : "live"} account found for user: ${userId}`)
      return NextResponse.json({
        success: true,
        isConnected: false,
        accountId: null,
        mode: isTestMode ? "test" : "live",
        message: `No ${isTestMode ? "test" : "live"} Stripe account connected`,
      })
    }

    console.log(`🔍 [Stripe Status] Checking account: ${accountId}`)

    try {
      // Retrieve account details from Stripe
      const account = await stripe.accounts.retrieve(accountId)

      console.log(`✅ [Stripe Status] Account retrieved:`, {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      })

      // Check requirements
      const requirements = account.requirements || {}
      const currentlyDue = requirements.currently_due || []
      const pastDue = requirements.past_due || []
      const requirementsCount = currentlyDue.length + pastDue.length

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
        },
        message:
          account.charges_enabled && account.payouts_enabled
            ? "Account fully connected and operational"
            : "Account connected but requires completion",
      })
    } catch (stripeError: any) {
      console.error(`❌ [Stripe Status] Error retrieving account ${accountId}:`, stripeError)

      // If account doesn't exist in Stripe, clean up Firestore
      if (stripeError.code === "resource_missing") {
        const cleanupData = isTestMode ? { stripeTestAccountId: null } : { stripeAccountId: null }

        await db.collection("users").doc(userId).update(cleanupData)

        return NextResponse.json({
          success: true,
          isConnected: false,
          accountId: null,
          mode: isTestMode ? "test" : "live",
          message: "Account not found in Stripe (cleaned up)",
        })
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to retrieve account status",
          details: stripeError.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Stripe Status] Connection status error:", error)
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
