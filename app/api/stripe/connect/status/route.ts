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
    console.log(`🔍 [Stripe Status] Checking status for user: ${userId}`)

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
      console.log(`📭 [Stripe Status] No account ID found for user ${userId}`)
      return NextResponse.json({
        connected: false,
        accountId: null,
        businessType: null,
        capabilities: null,
      })
    }

    try {
      // Get account details from Stripe
      const account = await stripe.accounts.retrieve(accountId)

      console.log(
        `📊 [Stripe Status] Account ${accountId} - Charges: ${account.charges_enabled}, Payouts: ${account.payouts_enabled}`,
      )

      const isFullyConnected = account.charges_enabled && account.payouts_enabled

      // Update local status if it has changed
      if (isFullyConnected !== userData?.[connectedField]) {
        await db
          .collection("users")
          .doc(userId)
          .update({
            [connectedField]: isFullyConnected,
            [`${accountIdField}BusinessType`]: account.business_type || "individual",
            [`${accountIdField}Country`]: account.country,
            [`${accountIdField}LastChecked`]: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
      }

      return NextResponse.json({
        connected: isFullyConnected,
        accountId: accountId,
        businessType: account.business_type || "individual",
        capabilities: {
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
        },
      })
    } catch (stripeError: any) {
      if (stripeError.code === "resource_missing") {
        console.warn(`⚠️ [Stripe Status] Account ${accountId} no longer exists, cleaning up`)

        // Clean up the invalid account ID
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
          businessType: null,
          capabilities: null,
        })
      }

      console.error("❌ [Stripe Status] Error retrieving account:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to check account status",
          details: stripeError.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Stripe Status] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
