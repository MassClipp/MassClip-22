import { type NextRequest, NextResponse } from "next/server"
import { ProfileViewSystem } from "@/lib/profile-view-system"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`📊 [Profile View Stats API] Fetching stats for: ${userId}`)

    const stats = await ProfileViewSystem.getProfileViewStats(userId)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("❌ [Profile View Stats API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch profile view stats",
      },
      { status: 500 },
    )
  }
}
