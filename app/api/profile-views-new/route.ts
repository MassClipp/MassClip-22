import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request.headers)

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("[v0] Fetching profile views for user:", userId)

    // Get profile views from multiple sources for accuracy
    const [userDoc, profileViewsSnapshot] = await Promise.all([
      db.collection("users").doc(userId).get(),
      db.collection("profile_views").where("profileUserId", "==", userId).get(),
    ])

    let totalViews = 0
    let todayViews = 0
    let lastView: string | null = null

    // Get views from user document
    if (userDoc.exists) {
      const userData = userDoc.data()
      totalViews = userData?.profileViews || 0
      lastView = userData?.lastProfileView?.toDate?.()?.toISOString() || null
    }

    // Count today's views from profile_views collection
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    profileViewsSnapshot.forEach((doc) => {
      const viewData = doc.data()
      const viewDate = viewData.timestamp?.toDate() || new Date(viewData.timestamp)

      if (viewDate >= today) {
        todayViews++
      }
    })

    // Use the higher count between user document and actual records
    const actualViewCount = profileViewsSnapshot.size
    if (actualViewCount > totalViews) {
      totalViews = actualViewCount

      // Update user document with correct count
      await db.collection("users").doc(userId).update({
        profileViews: totalViews,
      })
    }

    const stats = {
      totalViews,
      todayViews,
      lastView,
    }

    console.log("[v0] Profile views stats:", stats)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("[v0] Profile views API error:", error)
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
