import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

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

    console.log("🧹 [Test Cleanup] Cleaning up test account for user:", uid)

    // Remove test account references from Firestore
    // Note: We don't delete the actual Stripe account, just unlink it
    await db.collection("users").doc(uid).update({
      stripeTestAccountId: null,
      stripeTestAccountCreated: null,
      stripeTestAccountLinked: null,
      // Reset primary account ID in preview (you might want to restore live account ID here)
      stripeAccountId: null,
    })

    console.log("✅ [Test Cleanup] Removed test account references from Firestore")

    return NextResponse.json({
      success: true,
      message: "Test account references removed",
    })
  } catch (error) {
    console.error("❌ [Test Cleanup] Error cleaning up:", error)
    return NextResponse.json(
      {
        error: "Failed to cleanup test account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
