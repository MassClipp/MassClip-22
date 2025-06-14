import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Get user document to check profile views
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    // Get today's date for daily stats
    const today = new Date().toISOString().split("T")[0]
    const dailyStatsDoc = await db.collection("users").doc(userId).collection("daily_stats").doc(today).get()
    const dailyData = dailyStatsDoc.data()

    // Get analytics data
    const analyticsDoc = await db.collection("users").doc(userId).collection("analytics").doc("profile_views").get()
    const analyticsData = analyticsDoc.data()

    const stats = {
      totalViews: userData?.profileViews || 0,
      todayViews: dailyData?.profileViews || 0,
      lastView: userData?.lastProfileView?.toDate?.() || null,
      totalAnalytics: analyticsData?.totalViews || 0,
    }

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error("Error fetching profile view stats:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch profile view stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
