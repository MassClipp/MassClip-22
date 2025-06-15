import { type NextRequest, NextResponse } from "next/server"
import { ProfileViewSystem } from "@/lib/profile-view-system"

export async function POST(request: NextRequest) {
  try {
    const { profileUserId } = await request.json()

    if (!profileUserId) {
      return NextResponse.json({ error: "Profile user ID is required" }, { status: 400 })
    }

    console.log(`🔄 [Reset Profile Views API] Resetting count for: ${profileUserId}`)

    const result = await ProfileViewSystem.resetProfileViewCount(profileUserId)

    return NextResponse.json({
      success: result.success,
      message: result.message,
    })
  } catch (error) {
    console.error("❌ [Reset Profile Views API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to reset profile view count",
      },
      { status: 500 },
    )
  }
}
