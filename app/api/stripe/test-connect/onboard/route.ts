import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    // Only allow in preview environment
    if (process.env.VERCEL_ENV !== "preview") {
      return NextResponse.json({ error: "Test onboarding only available in preview environment" }, { status: 403 })
    }

    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Get user data
    const userDoc = await db.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()!
    const accountId = userData.stripeTestAccountId || userData.stripeAccountId

    if (!accountId) {
      return NextResponse.json({ error: "No test account found. Create one first." }, { status: 400 })
    }

    console.log("🧪 [Test Connect] Creating onboarding link for account:", accountId)

    // Check current account status
    const account = await stripe.accounts.retrieve(accountId)

    if (account.details_submitted && account.charges_enabled) {
      // Update user status
      await db
        .collection("users")
        .doc(uid)
        .update({
          stripeOnboardingComplete: true,
          stripeOnboarded: true,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          stripeCanReceivePayments: account.charges_enabled && account.payouts_enabled,
          stripeStatusLastChecked: new Date(),
        })

      return NextResponse.json({
        success: true,
        onboardingComplete: true,
        accountId: accountId,
        message: "Test account is already fully set up",
      })
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/test-refresh`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/test-success`,
      type: "account_onboarding",
    })

    console.log("✅ [Test Connect] Created onboarding link")

    return NextResponse.json({
      success: true,
      onboardingComplete: false,
      onboardingUrl: accountLink.url,
      accountId: accountId,
    })
  } catch (error) {
    console.error("❌ [Test Connect] Error creating onboarding link:", error)
    return NextResponse.json({ error: "Failed to create onboarding link" }, { status: 500 })
  }
}
