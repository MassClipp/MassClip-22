import { type NextRequest, NextResponse } from "next/server"
import { UserTrackingService } from "@/lib/user-tracking-service"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"

initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uid = searchParams.get("uid")

    if (!uid) {
      return NextResponse.json(
        { error: "Missing uid parameter" },
        { status: 400 }
      )
    }

    const tierInfo = await UserTrackingService.getUserTierInfo(uid)

    return NextResponse.json({
      success: true,
      data: tierInfo,
    })
  } catch (error) {
    console.error("❌ Error getting user tier info:", error)
    return NextResponse.json(
      { error: "Failed to get user tier info" },
      { status: 500 }
    )
  }
}
