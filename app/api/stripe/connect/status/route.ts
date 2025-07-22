import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"
import { getAuth } from "firebase-admin/auth"

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify the Firebase ID token
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Stripe Status] Invalid ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"

    const accountId = userData?.[accountIdField]

    if (!accountId) {
      return NextResponse.json({
        connected: false,
        accountId: null,
        capabilities: null,
        message: "No Stripe account found",
      })
    }

    try {
      // Retrieve account details from Stripe
      const account = await stripe.accounts.retrieve(accountId)

      const capabilities = {
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        currently_due: account.requirements?.currently_due || [],
        eventually_due: account.requirements?.eventually_due || [],
        past_due: account.requirements?.past_due || [],
      }

      const isFullyEnabled = account.charges_enabled && account.payouts_enabled

      // Update Firestore with current status
      await db
        .collection("users")
        .doc(userId)
        .update({
          [connectedField]: isFullyEnabled,
          [`${accountIdField}Details`]: {
            country: account.country,
            email: account.email,
            type: account.type,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
          },
          [`${accountIdField}LastChecked`]: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

      console.log(`✅ [Stripe Status] Account ${accountId} status: ${isFullyEnabled ? "ENABLED" : "PENDING"}`)

      return NextResponse.json({
        connected: isFullyEnabled,
        accountId: accountId,
        capabilities: capabilities,
        account: {
          country: account.country,
          email: account.email,
          type: account.type,
        },
        message: isFullyEnabled ? "Account fully enabled" : "Account pending completion",
      })
    } catch (error: any) {
      console.error(`❌ [Stripe Status] Failed to retrieve account ${accountId}:`, error)

      // If account doesn't exist, clear it from user data
      if (error.code === "resource_missing") {
        await db
          .collection("users")
          .doc(userId)
          .update({
            [accountIdField]: null,
            [connectedField]: false,
            updatedAt: new Date().toISOString(),
          })
      }

      return NextResponse.json({
        connected: false,
        accountId: accountId,
        capabilities: null,
        error: error.message,
        message: "Failed to retrieve account status",
      })
    }
  } catch (error: any) {
    console.error("❌ [Stripe Status] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
