import { type NextRequest, NextResponse } from "next/server"
import { ProfileViewSystem } from "@/lib/profile-view-system"

export async function POST(request: NextRequest) {
  try {
    const { profileUserId } = await request.json()

    if (!profileUserId) {
      return NextResponse.json({ error: "Profile user ID is required" }, { status: 400 })
    }

    console.log(`🔧 [Verify Profile Views API] Verifying count for: ${profileUserId}`)

    const result = await ProfileViewSystem.verifyAndRepairViewCount(profileUserId)

    return NextResponse.json({
      success: result.success,
      originalCount: result.originalCount,
      actualCount: result.actualCount,
      repaired: result.repaired,
      message: result.repaired
        ? `Repaired view count from ${result.originalCount} to ${result.actualCount}`
        : "View count is accurate",
    })
  } catch (error) {
    console.error("❌ [Verify Profile Views API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify profile view count",
      },
      { status: 500 },
    )
  }
}
