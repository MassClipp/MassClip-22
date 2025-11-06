import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Only allow in preview environment
    if (process.env.VERCEL_ENV !== "preview") {
      return NextResponse.json({ error: "Test account cleanup only available in preview environment" }, { status: 403 })
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
    const liveAccountId = userData.stripeAccountId !== testAccountId ? userData.stripeAccountId : null

    console.log("🧹 [Test Connect] Cleaning up test account for user:", uid)
    console.log("🧹 [Test Connect] Test account:", testAccountId)
    console.log("🧹 [Test Connect] Live account:", liveAccountId)

    // Update Firestore to remove test account references
    const updateData: any = {
      stripeTestAccountId: null,
      stripeTestAccountCreated: null,
      stripeTestAccountLinked: null,
    }

    // If we were using the test account as primary, restore live account or clear
    if (userData.stripeAccountId === testAccountId) {
      if (liveAccountId) {
        updateData.stripeAccountId = liveAccountId
        console.log("🔄 [Test Connect] Restoring live account as primary:", liveAccountId)
      } else {
        updateData.stripeAccountId = null
        updateData.stripeAccountCreated = null
        console.log("🔄 [Test Connect] No live account found, clearing primary account")
      }
    }

    await db.collection("users").doc(uid).update(updateData)

    console.log("✅ [Test Connect] Cleaned up test account references")

    return NextResponse.json({
      success: true,
      message: "Test account references removed",
      restoredLiveAccount: !!liveAccountId,
    })
  } catch (error) {
    console.error("❌ [Test Connect] Error cleaning up test account:", error)
    return NextResponse.json(
      {
        error: "Failed to clean up test account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
