import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const { profileUserId, viewerId } = await request.json()

    if (!profileUserId) {
      return NextResponse.json({ error: "Profile user ID is required" }, { status: 400 })
    }

    // Don't track self-views
    if (viewerId && viewerId === profileUserId) {
      console.log("Skipping self-view")
      return NextResponse.json({ success: true, message: "Self-view skipped" })
    }

    console.log(`🔍 [Track Profile View] Tracking view for profile: ${profileUserId}`)

    const timestamp = new Date()
    const dateKey = timestamp.toISOString().split("T")[0] // YYYY-MM-DD

    // Prepare view data
    const viewData = {
      profileUserId,
      viewerId: viewerId || "anonymous",
      timestamp,
      dateKey,
      userAgent: request.headers.get("user-agent") || "unknown",
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    }

    // Use batch operations for consistency
    const batch = db.batch()

    // 1. Update user's total profile views
    const userRef = db.collection("users").doc(profileUserId)
    batch.update(userRef, {
      profileViews: FieldValue.increment(1),
      lastProfileView: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 2. Log individual profile view
    const profileViewRef = db.collection("profile_views").doc()
    batch.set(profileViewRef, viewData)

    // 3. Update daily stats
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

    // 4. Update analytics
    const analyticsRef = db.collection("users").doc(profileUserId).collection("analytics").doc("profile_views")
    batch.set(
      analyticsRef,
      {
        totalViews: FieldValue.increment(1),
        lastView: FieldValue.serverTimestamp(),
        [`daily.${dateKey}`]: FieldValue.increment(1),
      },
      { merge: true },
    )

    // Execute all updates atomically
    await batch.commit()

    console.log(`✅ [Track Profile View] Successfully tracked view for profile: ${profileUserId}`)

    return NextResponse.json({ success: true, message: "Profile view tracked successfully" })
  } catch (error) {
    console.error("❌ [Track Profile View] Error tracking profile view:", error)
    return NextResponse.json(
      {
        error: "Failed to track profile view",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
