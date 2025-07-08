import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    // Only allow in preview environment
    if (process.env.VERCEL_ENV !== "preview") {
      return NextResponse.json({ error: "Test cleanup only available in preview environment" }, { status: 403 })
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
      return NextResponse.json({ error: "No test account to cleanup" }, { status: 400 })
    }

    console.log("🧹 [Test Connect] Cleaning up test account:", testAccountId)

    try {
      // Delete the Stripe account (this will fail if it has been used for payments)
      await stripe.accounts.del(testAccountId)
      console.log("✅ [Test Connect] Deleted Stripe account")
    } catch (stripeError) {
      console.warn("⚠️ [Test Connect] Could not delete Stripe account (may have transactions):", stripeError)
    }

    // Clean up Firestore data
    await db
      .collection("users")
      .doc(uid)
      .update({
        stripeTestAccountId: null,
        stripeTestAccountCreated: null,
        // Reset primary account ID if it was the test account
        ...(userData.stripeAccountId === testAccountId && {
          stripeAccountId: null,
          stripeAccountCreated: null,
          stripeOnboardingComplete: false,
          stripeOnboarded: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          stripeCanReceivePayments: false,
        }),
      })

    console.log("✅ [Test Connect] Cleaned up Firestore data")

    return NextResponse.json({
      success: true,
      message: "Test account cleaned up successfully",
    })
  } catch (error) {
    console.error("❌ [Test Connect] Error cleaning up test account:", error)
    return NextResponse.json({ error: "Failed to cleanup test account" }, { status: 500 })
  }
}
