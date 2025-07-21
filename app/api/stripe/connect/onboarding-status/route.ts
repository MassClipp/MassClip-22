import { type NextRequest, NextResponse } from "next/server"
import { verifyIdTokenFromRequest } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Onboarding Status] Checking onboarding status...")

    // Verify authentication
    const decodedToken = await verifyIdTokenFromRequest(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get user's Stripe account info from database
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      return NextResponse.json({
        connected: false,
        onboardingRequired: true,
        message: "No Stripe account found",
      })
    }

    const accountId = userData.stripeAccountId
    console.log("🏦 [Onboarding Status] Checking account:", accountId)

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(accountId)

    // Check if onboarding is complete
    const onboardingComplete = account.details_submitted && account.charges_enabled && account.payouts_enabled

    console.log("📊 [Onboarding Status] Account status:", {
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      onboarding_complete: onboardingComplete,
    })

    // Update database if onboarding is now complete
    if (onboardingComplete && !userData.stripeConnected) {
      await db.collection("users").doc(userId).set(
        {
          stripeConnected: true,
          stripeOnboardingCompleted: true,
          stripeOnboardingCompletedAt: new Date().toISOString(),
          stripeChargesEnabled: account.charges_enabled,
          stripePayoutsEnabled: account.payouts_enabled,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )

      console.log("✅ [Onboarding Status] Updated user as fully connected")
    }

    return NextResponse.json({
      connected: onboardingComplete,
      accountId: accountId,
      onboardingRequired: !onboardingComplete,
      account: {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
      },
    })
  } catch (error: any) {
    console.error("❌ [Onboarding Status] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to check onboarding status",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
