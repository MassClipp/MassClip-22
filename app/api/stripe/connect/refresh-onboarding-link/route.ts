import { type NextRequest, NextResponse } from "next/server"
import { verifyIdTokenFromRequest } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [Refresh Onboarding] Creating new onboarding link...")

    // Verify authentication
    const decodedToken = await verifyIdTokenFromRequest(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get user's Stripe account ID
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      return NextResponse.json({ error: "No Stripe account found. Please create an account first." }, { status: 400 })
    }

    const accountId = userData.stripeAccountId
    console.log("🏦 [Refresh Onboarding] Refreshing link for account:", accountId)

    // Create new account link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding?refresh=true&account=${accountId}`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/onboarding/success?account=${accountId}`,
      type: "account_onboarding",
    })

    console.log("✅ [Refresh Onboarding] New onboarding link created")

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
      accountId: accountId,
    })
  } catch (error: any) {
    console.error("❌ [Refresh Onboarding] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to refresh onboarding link",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
