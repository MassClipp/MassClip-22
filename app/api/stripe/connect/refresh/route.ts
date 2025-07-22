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
      console.error("❌ [Stripe Refresh] Invalid ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`🔄 [Stripe Refresh] Refreshing onboarding for user: ${userId}`)

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const accountId = userData?.[accountIdField]

    if (!accountId) {
      return NextResponse.json({ error: "No Stripe account found to refresh" }, { status: 404 })
    }

    try {
      // Verify account still exists
      const account = await stripe.accounts.retrieve(accountId)

      // If already fully enabled, no need to refresh
      if (account.charges_enabled && account.payouts_enabled) {
        return NextResponse.json({
          onboardingComplete: true,
          accountId: accountId,
          businessType: account.business_type || "individual",
          message: "Account is already fully enabled",
        })
      }

      // Create fresh account link for continuing onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?success=true`,
        type: "account_onboarding",
      })

      console.log(`🔗 [Stripe Refresh] Created refresh link for account ${accountId}`)

      return NextResponse.json({
        onboardingComplete: false,
        onboardingUrl: accountLink.url,
        accountId: accountId,
        message: "Onboarding link refreshed",
      })
    } catch (stripeError: any) {
      if (stripeError.code === "resource_missing") {
        // Account was deleted, clean up our records
        console.warn(`⚠️ [Stripe Refresh] Account ${accountId} no longer exists`)

        await db
          .collection("users")
          .doc(userId)
          .update({
            [accountIdField]: null,
            [`${isTestMode ? "stripeTestConnected" : "stripeConnected"}`]: false,
            [`${accountIdField}RemovedAt`]: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })

        return NextResponse.json(
          {
            error: "Account no longer exists",
            accountDeleted: true,
            message: "Please create a new Stripe account",
          },
          { status: 404 },
        )
      }

      console.error("❌ [Stripe Refresh] Error refreshing account:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to refresh onboarding",
          details: stripeError.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Stripe Refresh] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
