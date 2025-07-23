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
    const localConnectedStatus = userData?.[connectedField]

    console.log(`🔍 [Status] Checking status for user ${userId}:`, {
      accountId,
      localConnectedStatus,
      testMode: isTestMode,
    })

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

      const isFullyOnboarded =
        account.details_submitted &&
        account.charges_enabled &&
        account.payouts_enabled &&
        (!account.requirements?.currently_due || account.requirements.currently_due.length === 0) &&
        (!account.requirements?.past_due || account.requirements.past_due.length === 0)

      const capabilities = {
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        currently_due: account.requirements?.currently_due || [],
        past_due: account.requirements?.past_due || [],
        eventually_due: account.requirements?.eventually_due || [],
      }

      console.log(`🔍 [Status] Account ${accountId} capabilities:`, capabilities)

      // Update local status if it doesn't match Stripe
      if (localConnectedStatus !== isFullyOnboarded) {
        console.log(`🔄 [Status] Updating local status from ${localConnectedStatus} to ${isFullyOnboarded}`)
        await db
          .collection("users")
          .doc(userId)
          .update({
            [connectedField]: isFullyOnboarded,
            [`${accountIdField}ChargesEnabled`]: account.charges_enabled,
            [`${accountIdField}PayoutsEnabled`]: account.payouts_enabled,
            [`${accountIdField}DetailsSubmitted`]: account.details_submitted,
            [`${accountIdField}Requirements`]: {
              currently_due: account.requirements?.currently_due || [],
              past_due: account.requirements?.past_due || [],
              eventually_due: account.requirements?.eventually_due || [],
            },
            updatedAt: new Date().toISOString(),
          })
      }

      return NextResponse.json({
        connected: isFullyOnboarded,
        accountId,
        capabilities,
        businessType: account.business_type || "individual",
        country: account.country,
        message: isFullyOnboarded
          ? "Account is fully connected and ready to accept payments"
          : "Account needs additional setup to accept payments",
      })
    } catch (stripeError: any) {
      if (stripeError.code === "resource_missing") {
        console.warn(`⚠️ [Status] Account ${accountId} no longer exists in Stripe`)

        // Clear the invalid account from Firestore
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
          accountDeleted: true,
          message: "Account was deleted from Stripe",
        })
      }

      console.error("❌ [Status] Error checking account status:", stripeError)
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
