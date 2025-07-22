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
      return NextResponse.json({ error: "No Stripe account found" }, { status: 404 })
    }

    try {
      // Check if account still exists
      const account = await stripe.accounts.retrieve(accountId)

      // If account is complete, return success
      if (account.charges_enabled && account.payouts_enabled) {
        console.log(`✅ [Stripe Refresh] Account ${accountId} is now complete`)

        const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"
        await db
          .collection("users")
          .doc(userId)
          .update({
            [connectedField]: true,
            [`${accountIdField}BusinessType`]: account.business_type || "individual",
            [`${accountIdField}Country`]: account.country,
            [`${accountIdField}LastVerified`]: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })

        return NextResponse.json({
          onboardingComplete: true,
          accountId: accountId,
          businessType: account.business_type || "individual",
        })
      }

      // Account needs more setup - create new onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?success=true`,
        type: "account_onboarding",
      })

      console.log(`🔗 [Stripe Refresh] Created new onboarding link for account ${accountId}`)

      return NextResponse.json({
        onboardingComplete: false,
        onboardingUrl: accountLink.url,
        accountId: accountId,
      })
    } catch (stripeError: any) {
      if (stripeError.code === "resource_missing") {
        console.warn(`⚠️ [Stripe Refresh] Account ${accountId} no longer exists`)

        // Clean up the invalid account
        const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"
        await db
          .collection("users")
          .doc(userId)
          .update({
            [accountIdField]: null,
            [connectedField]: false,
            [`${accountIdField}RemovedAt`]: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })

        return NextResponse.json(
          {
            accountDeleted: true,
            error: "Account no longer exists",
          },
          { status: 404 },
        )
      }

      console.error("❌ [Stripe Refresh] Error with account:", stripeError)
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
