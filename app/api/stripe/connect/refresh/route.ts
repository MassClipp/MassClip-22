import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"
import { getAuth } from "firebase-admin/auth"

interface RefreshRequest {
  idToken: string
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as RefreshRequest

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Refresh] Invalid ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`🔄 [Refresh] Refreshing onboarding for user: ${userId}`)

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
      return NextResponse.json({ error: "No Stripe account found" }, { status: 404 })
    }

    try {
      // Check current account status
      const account = await stripe.accounts.retrieve(accountId)

      const isFullyOnboarded =
        account.details_submitted &&
        account.charges_enabled &&
        account.payouts_enabled &&
        (!account.requirements?.currently_due || account.requirements.currently_due.length === 0) &&
        (!account.requirements?.past_due || account.requirements.past_due.length === 0)

      console.log(`🔍 [Refresh] Account ${accountId} status:`, {
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        currently_due: account.requirements?.currently_due?.length || 0,
        isFullyOnboarded,
      })

      if (isFullyOnboarded) {
        // Update local status
        await db
          .collection("users")
          .doc(userId)
          .update({
            [connectedField]: true,
            updatedAt: new Date().toISOString(),
          })

        return NextResponse.json({
          success: true,
          onboardingComplete: true,
          accountId,
          message: "Account is fully onboarded",
        })
      }

      // Create new onboarding link
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/dashboard/earnings?refresh=true`,
        return_url: `${baseUrl}/dashboard/earnings?success=true`,
        type: "account_onboarding",
      })

      console.log(`✅ [Refresh] Created new onboarding link for account ${accountId}`)

      return NextResponse.json({
        success: true,
        onboardingComplete: false,
        onboardingUrl: accountLink.url,
        accountId,
        message: "New onboarding link created",
      })
    } catch (stripeError: any) {
      if (stripeError.code === "resource_missing") {
        console.warn(`⚠️ [Refresh] Account ${accountId} no longer exists`)

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
          success: false,
          accountDeleted: true,
          message: "Account was deleted from Stripe",
        })
      }

      console.error("❌ [Refresh] Error with Stripe account:", stripeError)
      return NextResponse.json({ error: "Failed to refresh onboarding", details: stripeError.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error("❌ [Refresh] Unexpected error:", error)
    return NextResponse.json({ error: "Failed to refresh onboarding", details: error.message }, { status: 500 })
  }
}
