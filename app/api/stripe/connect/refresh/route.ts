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
      // Create a new account link for continued onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?success=true`,
        type: "account_onboarding",
      })

      console.log(`🔗 [Stripe Refresh] Created refresh link for account ${accountId}`)

      return NextResponse.json({
        onboardingUrl: accountLink.url,
        accountId: accountId,
      })
    } catch (error: any) {
      console.error("❌ [Stripe Refresh] Failed to create refresh link:", error)
      return NextResponse.json({ error: "Failed to create refresh link", details: error.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error("❌ [Stripe Refresh] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
