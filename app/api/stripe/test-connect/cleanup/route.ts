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

    console.log("🧹 [Test Cleanup] Removing test account data for user:", uid)

    // Remove test account data from Firestore (but keep live account data)
    await db.collection("users").doc(uid).update({
      stripeTestAccountId: null,
      stripeTestAccountCreated: null,
      // Reset primary account ID in preview (will need to recreate)
      stripeAccountId: null,
      stripeAccountCreated: null,
    })

    console.log("✅ [Test Cleanup] Removed test account data from Firestore")

    return NextResponse.json({
      success: true,
      message: "Test account data removed. You can create a new test account.",
    })
  } catch (error) {
    console.error("❌ [Test Cleanup] Error during cleanup:", error)
    return NextResponse.json({ error: "Failed to cleanup test account" }, { status: 500 })
  }
}
