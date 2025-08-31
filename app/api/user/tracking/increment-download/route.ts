import { type NextRequest, NextResponse } from "next/server"
import { UserTrackingService } from "@/lib/user-tracking-service"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"

initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, videoId, creatorId, contentTitle } = body

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 })
    }

    await UserTrackingService.incrementDownloadUsage(uid)

    if (videoId && creatorId) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/notifications/download`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            videoId,
            creatorId,
            downloaderId: uid,
            contentTitle,
          }),
        })
        console.log(`🔔 Download notification triggered for creator: ${creatorId}`)
      } catch (notificationError) {
        console.warn("Failed to trigger download notification:", notificationError)
        // Don't throw error - notifications are non-critical
      }
    }

    // Get updated tier info to return current usage
    const tierInfo = await UserTrackingService.getUserTierInfo(uid)

    return NextResponse.json({
      success: true,
      message: "Download usage incremented",
      data: tierInfo,
    })
  } catch (error) {
    console.error("❌ Error incrementing download usage:", error)
    return NextResponse.json({ error: "Failed to increment download usage" }, { status: 500 })
  }
}
