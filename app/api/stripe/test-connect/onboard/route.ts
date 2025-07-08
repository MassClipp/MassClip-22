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

    if (!userData.stripeTestAccountId) {
      return NextResponse.json({ error: "No test account found" }, { status: 404 })
    }

    console.log("🔗 [Test Connect] Creating onboarding link for account:", userData.stripeTestAccountId)

    // Check if account is already fully onboarded
    const account = await stripe.accounts.retrieve(userData.stripeTestAccountId)

    if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
      return NextResponse.json({
        success: true,
        onboardingComplete: true,
        message: "Account is already fully onboarded",
      })
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: userData.stripeTestAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/test-refresh`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/test-success`,
      type: "account_onboarding",
    })

    console.log("✅ [Test Connect] Created onboarding link")

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
      message: "Onboarding link created",
    })
  } catch (error) {
    console.error("❌ [Test Connect] Error creating onboarding link:", error)
    return NextResponse.json({ error: "Failed to create onboarding link" }, { status: 500 })
  }
}
