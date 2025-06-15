import { type NextRequest, NextResponse } from "next/server"
import { ProfileViewSystem } from "@/lib/profile-view-system"

export async function POST(request: NextRequest) {
  try {
    const { profileUserId } = await request.json()

    if (!profileUserId) {
      return NextResponse.json({ error: "Profile user ID is required" }, { status: 400 })
    }

    console.log(`🔄 [Sync Profile Views API] Syncing views for: ${profileUserId}`)

    // Verify and repair the profile view count
    const result = await ProfileViewSystem.verifyAndRepairViewCount(profileUserId)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("❌ [Sync Profile Views API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync profile views",
      },
      { status: 500 },
    )
  }
}
