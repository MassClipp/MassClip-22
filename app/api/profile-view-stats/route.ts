import { type NextRequest, NextResponse } from "next/server"
import { ProfileViewTracker } from "@/lib/profile-view-tracker"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const profileUserId = searchParams.get("userId")

    if (!profileUserId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const stats = await ProfileViewTracker.getProfileViewStats(profileUserId)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("Error getting profile view stats:", error)
    return NextResponse.json(
      {
        error: "Failed to get profile view stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
