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

    // Get user data
    const userDoc = await db.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()!

    console.log("🧹 [Test Cleanup] Cleaning up test account for user:", uid)

    // Remove test account references from Firestore
    const updateData: any = {
      stripeTestAccountId: null,
      stripeTestAccountCreated: null,
      stripeTestAccountLinked: null,
    }

    // If the current stripeAccountId is the test account, remove it too
    if (userData.stripeAccountId === userData.stripeTestAccountId) {
      updateData.stripeAccountId = null
      updateData.stripeAccountCreated = null
    }

    await db.collection("users").doc(uid).update(updateData)

    console.log("✅ [Test Cleanup] Removed test account references from Firestore")

    return NextResponse.json({
      success: true,
      message: "Test account references cleaned up successfully",
    })
  } catch (error) {
    console.error("❌ [Test Cleanup] Error cleaning up test account:", error)
    return NextResponse.json(
      {
        error: "Failed to cleanup test account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
