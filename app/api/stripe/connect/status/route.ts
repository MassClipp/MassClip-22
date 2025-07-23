import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"
import { getAuth } from "firebase-admin/auth"

interface StatusRequest {
  idToken: string
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as StatusRequest

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
    console.log(`🔍 [Status] Checking connection status for user: ${userId}`)

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

    console.log(`🔍 [Status] Local data:`, {
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
      // Get real-time account status from Stripe
      const account = await stripe.accounts.retrieve(accountId)

      const isFullyConnected =
        account.details_submitted &&
        account.charges_enabled &&
        account.payouts_enabled &&
        (!account.requirements?.currently_due || account.requirements.currently_due.length === 0) &&
        (!account.requirements?.past_due || account.requirements.past_due.length === 0)

      console.log(`🔍 [Status] Stripe account status:`, {
        accountId,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        currently_due: account.requirements?.currently_due?.length || 0,
        past_due: account.requirements?.past_due?.length || 0,
        isFullyConnected,
      })

      // Update local status if it doesn't match Stripe
      if (localConnectedStatus !== isFullyConnected) {
        console.log(`🔄 [Status] Updating local status from ${localConnectedStatus} to ${isFullyConnected}`)
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
        capabilities: {
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          currently_due: account.requirements?.currently_due || [],
          past_due: account.requirements?.past_due || [],
        },
        account: {
          email: account.email,
          country: account.country,
          business_type: account.business_type,
          details_submitted: account.details_submitted,
        },
        message: isFullyConnected ? "Account fully connected" : "Account needs completion",
      })
    } catch (stripeError: any) {
      if (stripeError.code === "resource_missing") {
        console.warn(`⚠️ [Status] Account ${accountId} no longer exists in Stripe`)

        // Clean up local data
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

      console.error("❌ [Status] Error checking Stripe account:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to check account status",
          details: stripeError.message,
          connected: false,
          accountId,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Status] Unexpected error:", error)
    return NextResponse.json({ error: "Failed to check connection status", details: error.message }, { status: 500 })
  }
}
