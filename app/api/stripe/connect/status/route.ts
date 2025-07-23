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

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Status] Invalid ID token:", error)
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
        message: "No Stripe account connected",
      })
    }

    try {
      // Get fresh account data from Stripe
      const account = await stripe.accounts.retrieve(accountId)

      const isFullyConnected =
        account.details_submitted &&
        account.charges_enabled &&
        account.payouts_enabled &&
        (!account.requirements?.currently_due || account.requirements.currently_due.length === 0)

      // Update local status if it differs from Stripe
      if (userData?.[connectedField] !== isFullyConnected) {
        await db
          .collection("users")
          .doc(userId)
          .update({
            [connectedField]: isFullyConnected,
            updatedAt: new Date().toISOString(),
          })
      }

      return NextResponse.json({
        connected: isFullyConnected,
        accountId,
        businessType: account.business_type || "individual",
        capabilities: {
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          currently_due: account.requirements?.currently_due || [],
          past_due: account.requirements?.past_due || [],
        },
        details_submitted: account.details_submitted,
        message: isFullyConnected ? "Account fully connected" : "Account needs completion",
      })
    } catch (stripeError: any) {
      if (stripeError.code === "resource_missing") {
        // Account was deleted, clean up local data
        await db
          .collection("users")
          .doc(userId)
          .update({
            [accountIdField]: null,
            [connectedField]: false,
            [`${accountIdField}RemovedAt`]: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })

        return NextResponse.json({
          connected: false,
          accountId: null,
          message: "Account no longer exists",
        })
      }

      console.error("❌ [Status] Error checking account:", stripeError)
      return NextResponse.json(
        { error: "Failed to check account status", details: stripeError.message },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Status] Unexpected error:", error)
    return NextResponse.json({ error: "Failed to check connection status", details: error.message }, { status: 500 })
  }
}
