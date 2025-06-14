import { type NextRequest, NextResponse } from "next/server"
import { ProfileViewTracker } from "@/lib/profile-view-tracker"
import { headers } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { profileUserId, viewerId } = await request.json()

    if (!profileUserId) {
      return NextResponse.json({ error: "Profile user ID is required" }, { status: 400 })
    }

    // Get request metadata
    const headersList = headers()
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || request.ip || "unknown"
    const userAgent = headersList.get("user-agent") || "unknown"
    const referrer = headersList.get("referer") || "direct"

    // Track the profile view
    await ProfileViewTracker.trackProfileViewServer(profileUserId, {
      viewerId,
      ipAddress,
      userAgent,
      referrer,
    })

    return NextResponse.json({
      success: true,
      message: "Profile view tracked successfully",
    })
  } catch (error) {
    console.error("Error in track-profile-view API:", error)
    return NextResponse.json(
      {
        error: "Failed to track profile view",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
