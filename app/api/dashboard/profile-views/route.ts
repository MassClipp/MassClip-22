import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

// Import server-side Firebase admin
async function getFirebaseAdmin() {
  const { db: adminDb } = await import("@/lib/firebase-server")
  return adminDb
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Profile Views API] Fetching profile views...")

    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error("❌ [Profile Views API] No authenticated user")
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const userId = session.user.id
    console.log("👤 [Profile Views API] User ID:", userId)

    // Get Firebase Admin instance
    const adminDb = await getFirebaseAdmin()

    // Fetch user document
    const userDoc = await adminDb.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.error("❌ [Profile Views API] User document not found")
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const profileViews = userData?.profileViews || 0

    console.log("📊 [Profile Views API] Profile views found:", profileViews)

    return NextResponse.json({
      success: true,
      profileViews,
      userId,
    })
  } catch (error) {
    console.error("❌ [Profile Views API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch profile views",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
