import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    // Only allow in preview environment
    if (process.env.VERCEL_ENV !== "preview") {
      return NextResponse.json({ error: "Test status only available in preview environment" }, { status: 403 })
    }

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 })
    }

    const idToken = authHeader.replace("Bearer ", "")

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
      return NextResponse.json({
        hasTestAccount: false,
        accountId: null,
        status: "none",
        message: "No test account found - create one to start testing",
      })
    }

    console.log("🔍 [Test Status] Checking status for account:", userData.stripeTestAccountId)

    try {
      // Get account details from Stripe
      const account = await stripe.accounts.retrieve(userData.stripeTestAccountId)

      const isActive = account.details_submitted && account.charges_enabled && account.payouts_enabled
      const status = isActive ? "active" : account.details_submitted ? "pending" : "restricted"

      let message = "Test account found"
      if (isActive) {
        message = "Test account is active and ready"
      } else if (account.details_submitted) {
        message = "Test account pending review"
      } else {
        message = "Test account needs setup"
      }

      console.log("✅ [Test Status] Account status:", {
        id: account.id,
        status,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      })

      return NextResponse.json({
        hasTestAccount: true,
        accountId: account.id,
        status,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        message,
      })
    } catch (stripeError: any) {
      console.error("❌ [Test Status] Stripe error:", stripeError)

      // If account not found, clean up the reference
      if (stripeError.code === "resource_missing") {
        await db.collection("users").doc(uid).update({
          stripeTestAccountId: null,
          stripeTestAccountCreated: null,
          stripeTestAccountLinked: null,
        })

        return NextResponse.json({
          hasTestAccount: false,
          accountId: null,
          status: "none",
          message: "Test account not found - create one to start testing",
        })
      }

      return NextResponse.json(
        {
          hasTestAccount: true,
          accountId: userData.stripeTestAccountId,
          status: "error",
          message: `Error checking account: ${stripeError.message}`,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("❌ [Test Status] Error checking test status:", error)
    return NextResponse.json(
      {
        error: "Failed to check test status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
