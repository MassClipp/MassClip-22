import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    // Only allow in preview environment
    if (process.env.VERCEL_ENV !== "preview") {
      return NextResponse.json({ error: "Test status check only available in preview environment" }, { status: 403 })
    }

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 })
    }

    const idToken = authHeader.substring(7)

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Get user data
    const userDoc = await db.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()!

    // Check for TEST account specifically (not live account)
    if (!userData.stripeTestAccountId) {
      console.log("🧪 [Test Status] No test account found for user:", uid)
      return NextResponse.json({
        hasTestAccount: false,
        accountId: null,
        status: "none",
        message: "No test account found - create one to start testing",
      })
    }

    console.log("📊 [Test Status] Checking status for TEST account:", userData.stripeTestAccountId)

    try {
      // Get account details from Stripe
      const account = await stripe.accounts.retrieve(userData.stripeTestAccountId)

      let status = "pending"
      let message = "Test account created, setup required"

      if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
        status = "active"
        message = "Test account is active and ready for testing"
      } else if (account.details_submitted) {
        status = "submitted"
        message = "Details submitted, pending review"
      }

      return NextResponse.json({
        hasTestAccount: true,
        accountId: userData.stripeTestAccountId,
        status,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        message,
      })
    } catch (stripeError) {
      console.error("❌ [Test Status] Stripe error:", stripeError)
      // Account might not exist in Stripe anymore
      return NextResponse.json({
        hasTestAccount: false,
        accountId: null,
        status: "error",
        message: "Test account not found in Stripe - may need to recreate",
      })
    }
  } catch (error) {
    console.error("❌ [Test Status] Error checking status:", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}
