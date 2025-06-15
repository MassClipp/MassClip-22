import { type NextRequest, NextResponse } from "next/server"
import { ProfileViewSystem } from "@/lib/profile-view-system"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profileUserId, viewerId } = body

    if (!profileUserId) {
      return NextResponse.json({ error: "Profile user ID is required" }, { status: 400 })
    }

    // Extract request metadata
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    console.log(`🔍 [Track Profile View API] Processing view for: ${profileUserId}`)

    // Track the view using the new system
    const result = await ProfileViewSystem.trackProfileView({
      profileUserId,
      viewerId,
      ipAddress,
      userAgent,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        viewCount: result.viewCount,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("❌ [Track Profile View API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
