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
      return NextResponse.json({ success: true, message: "Self-view skipped" })
    }

    console.log(`🔍 [API] Tracking profile view for: ${profileUserId}`)

    // Get request metadata
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    const referrer = request.headers.get("referer") || "direct"

    const timestamp = new Date()
    const dateKey = timestamp.toISOString().split("T")[0] // YYYY-MM-DD

    // Prepare view data
    const viewData = {
      profileUserId,
      viewerId: viewerId || "anonymous",
      timestamp,
      dateKey,
      ipAddress,
      userAgent,
      referrer,
    }

    // Use a batch for atomic operations
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
    batch.create(profileViewRef, viewData)

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

    // Execute batch
    await batch.commit()

    console.log(`✅ [API] Successfully tracked profile view for: ${profileUserId}`)

    return NextResponse.json({
      success: true,
      message: "Profile view tracked successfully",
    })
  } catch (error) {
    console.error("❌ [API] Error tracking profile view:", error)
    return NextResponse.json(
      {
        error: "Failed to track profile view",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
