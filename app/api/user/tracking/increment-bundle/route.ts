import { type NextRequest, NextResponse } from "next/server"
import { UserTrackingService } from "@/lib/user-tracking-service"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"

initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid } = body

    if (!uid) {
      return NextResponse.json(
        { error: "Missing uid" },
        { status: 400 }
      )
    }

    await UserTrackingService.incrementBundleCount(uid)

    // Get updated tier info to return current usage
    const tierInfo = await UserTrackingService.getUserTierInfo(uid)

    return NextResponse.json({
      success: true,
      message: "Bundle count incremented",
      data: tierInfo,
    })
  } catch (error) {
    console.error("❌ Error incrementing bundle count:", error)
    return NextResponse.json(
      { error: "Failed to increment bundle count" },
      { status: 500 }
    )
  }
}
