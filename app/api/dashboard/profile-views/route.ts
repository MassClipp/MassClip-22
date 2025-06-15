import { type NextRequest, NextResponse } from "next/server"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`📊 [Dashboard Profile Views API] Fetching for user: ${userId}`)

    // Get user document directly from Firestore
    const userDocRef = doc(db, "users", userId)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const profileViews = userData.profileViews || 0

    console.log(`✅ [Dashboard Profile Views API] Found ${profileViews} views for user ${userId}`)

    return NextResponse.json({
      success: true,
      profileViews,
      lastUpdated: userData.updatedAt || null,
    })
  } catch (error) {
    console.error("❌ [Dashboard Profile Views API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch profile views",
      },
      { status: 500 },
    )
  }
}
