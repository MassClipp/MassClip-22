import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const { profileUserId, viewerId } = await request.json()

    if (!profileUserId) {
      return NextResponse.json({ error: "Profile user ID is required" }, { status: 400 })
    }

    if (viewerId && viewerId === profileUserId) {
      console.log("[v0] Skipping self-view")
      return NextResponse.json({ success: true, message: "Self-view skipped" })
    }

    console.log(`[v0] Tracking view for profile: ${profileUserId}`)

    const timestamp = new Date()
    const dateKey = timestamp.toISOString().split("T")[0] // YYYY-MM-DD

    const viewData = {
      profileUserId,
      viewerId: viewerId || "anonymous",
      timestamp,
      dateKey,
      userAgent: request.headers.get("user-agent") || "unknown",
    }

    const batch = db.batch()

    // 1. Update user's total profile views
    const userRef = db.collection("users").doc(profileUserId)
    batch.update(userRef, {
      profileViews: FieldValue.increment(1),
      lastProfileView: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 2. Log individual profile view for analytics
    const profileViewRef = db.collection("profile_views").doc()
    batch.set(profileViewRef, viewData)

    // 3. Update daily stats for dashboard
    const dailyStatsRef = db.collection("users").doc(profileUserId).collection("daily_stats").doc(dateKey)
    batch.set(
      dailyStatsRef,
      {
        date: dateKey,
        profileViews: FieldValue.increment(1),
        lastView: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    // Execute all updates atomically
    await batch.commit()

    console.log(`[v0] Successfully tracked view for profile: ${profileUserId}`)

    return NextResponse.json({ success: true, message: "Profile view tracked successfully" })
  } catch (error) {
    console.error("[v0] Error tracking profile view:", error)
    return NextResponse.json(
      {
        error: "Failed to track profile view",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
