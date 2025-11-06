import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    // Only allow in preview environment
    if (process.env.VERCEL_ENV !== "preview") {
      return NextResponse.json({ error: "Test account status only available in preview environment" }, { status: 403 })
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
    const testAccountId = userData.stripeTestAccountId

    console.log("🔍 [Test Connect] Checking status for user:", uid, "account:", testAccountId)

    if (!testAccountId) {
      return NextResponse.json({
        hasTestAccount: false,
        accountId: null,
        status: "none",
        message: "No test account found - create one to start testing",
      })
    }

    try {
      // Get account details from Stripe
      const account = await stripe.accounts.retrieve(testAccountId)

      console.log("✅ [Test Connect] Account status:", {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements?.currently_due?.length || 0,
      })

      // Determine account status
      let status = "incomplete"
      let message = "Test account needs setup"

      if (account.charges_enabled && account.payouts_enabled) {
        status = "active"
        message = "Test account is active and ready"
      } else if (account.details_submitted) {
        status = "pending"
        message = "Test account is under review"
      } else {
        status = "incomplete"
        message = "Test account needs onboarding"
      }

      return NextResponse.json({
        hasTestAccount: true,
        accountId: testAccountId,
        status,
        message,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirementsCount: account.requirements?.currently_due?.length || 0,
        accountType: account.type,
        country: account.country,
      })
    } catch (stripeError: any) {
      console.error("❌ [Test Connect] Error retrieving account:", stripeError)

      // If account doesn't exist, clear it from Firestore
      if (stripeError.code === "resource_missing") {
        await db.collection("users").doc(uid).update({
          stripeTestAccountId: null,
          stripeTestAccountLinked: null,
        })

        return NextResponse.json({
          hasTestAccount: false,
          accountId: null,
          status: "none",
          message: "Test account not found - create one to start testing",
        })
      }

      return NextResponse.json({
        hasTestAccount: true,
        accountId: testAccountId,
        status: "error",
        message: "Error checking test account status",
        error: stripeError.message,
      })
    }
  } catch (error) {
    console.error("❌ [Test Connect] Error checking status:", error)
    return NextResponse.json(
      {
        error: "Failed to check test account status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
