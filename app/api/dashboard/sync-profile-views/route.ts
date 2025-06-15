import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

// Import server-side Firebase admin
async function getFirebaseAdmin() {
  const { db: adminDb } = await import("@/lib/firebase-server")
  return adminDb
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [Sync Profile Views API] Starting sync...")

    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error("❌ [Sync Profile Views API] No authenticated user")
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const userId = session.user.id
    console.log("👤 [Sync Profile Views API] User ID:", userId)

    // Get Firebase Admin instance
    const adminDb = await getFirebaseAdmin()

    // Get current profile views from user document
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const currentViews = userDoc.exists ? userDoc.data()?.profileViews || 0 : 0

    // Count actual profile view records
    const profileViewsSnapshot = await adminDb.collection("profileViews").where("profileUserId", "==", userId).get()

    const actualViewCount = profileViewsSnapshot.size

    console.log("📊 [Sync Profile Views API] Current views:", currentViews)
    console.log("📊 [Sync Profile Views API] Actual view records:", actualViewCount)

    // Update if there's a mismatch
    if (currentViews !== actualViewCount) {
      await adminDb.collection("users").doc(userId).update({
        profileViews: actualViewCount,
        lastViewSync: new Date(),
      })

      console.log("✅ [Sync Profile Views API] Synced views:", actualViewCount)

      return NextResponse.json({
        success: true,
        synced: true,
        previousCount: currentViews,
        actualCount: actualViewCount,
        message: "Profile views synced successfully",
      })
    }

    return NextResponse.json({
      success: true,
      synced: false,
      count: currentViews,
      message: "Profile views already in sync",
    })
  } catch (error) {
    console.error("❌ [Sync Profile Views API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync profile views",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
