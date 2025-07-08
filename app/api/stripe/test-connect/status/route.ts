import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    // Only allow in preview environment
    if (process.env.VERCEL_ENV !== "preview") {
      return NextResponse.json({ error: "Test status check only available in preview environment" }, { status: 403 })
    }

    // Get user from session/cookies (simplified for preview)
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization" }, { status: 401 })
    }

    const idToken = authHeader.slice(7)
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
      return NextResponse.json({
        hasTestAccount: false,
        accountId: null,
        status: "no_account",
        message: "No test account found",
      })
    }

    // Get account status from Stripe
    const account = await stripe.accounts.retrieve(accountId)

    return NextResponse.json({
      hasTestAccount: true,
      accountId: accountId,
      status: account.details_submitted && account.charges_enabled ? "active" : "pending",
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      message:
        account.details_submitted && account.charges_enabled
          ? "Test account is active and ready"
          : "Test account needs onboarding",
    })
  } catch (error) {
    console.error("❌ [Test Connect] Error checking status:", error)
    return NextResponse.json({ error: "Failed to check test account status" }, { status: 500 })
  }
}
