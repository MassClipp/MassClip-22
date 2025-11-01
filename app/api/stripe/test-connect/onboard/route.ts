import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    // Only allow in preview environment
    if (process.env.VERCEL_ENV !== "preview") {
      return NextResponse.json(
        { error: "Test account onboarding only available in preview environment" },
        { status: 403 },
      )
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
    const testAccountId = userData.stripeTestAccountId

    if (!testAccountId) {
      return NextResponse.json({ error: "No test account found. Create one first." }, { status: 400 })
    }

    console.log("🚀 [Test Connect] Starting onboarding for account:", testAccountId)

    try {
      // Check if account is already fully onboarded
      const account = await stripe.accounts.retrieve(testAccountId)

      if (account.charges_enabled && account.payouts_enabled) {
        console.log("✅ [Test Connect] Account already fully onboarded")
        return NextResponse.json({
          success: true,
          onboardingComplete: true,
          message: "Account is already fully set up",
        })
      }

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: testAccountId,
        refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/test-refresh`,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/test-success`,
        type: "account_onboarding",
      })

      console.log("✅ [Test Connect] Created onboarding link:", accountLink.url)

      return NextResponse.json({
        success: true,
        onboardingUrl: accountLink.url,
        message: "Onboarding link created",
      })
    } catch (stripeError: any) {
      console.error("❌ [Test Connect] Stripe error:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to create onboarding link",
          details: stripeError.message || "Unknown Stripe error",
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("❌ [Test Connect] Error creating onboarding link:", error)
    return NextResponse.json(
      {
        error: "Failed to create onboarding link",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
