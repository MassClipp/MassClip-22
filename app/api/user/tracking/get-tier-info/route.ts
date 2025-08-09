import { type NextRequest, NextResponse } from "next/server"
import { UserTrackingService } from "@/lib/user-tracking-service"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"

initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid } = body || {}
    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 })
    }

    const info = await UserTrackingService.getUserTierInfo(uid)
    return NextResponse.json({ success: true, data: info })
  } catch (error) {
    console.error("❌ Error getting user tier info:", error)
    return NextResponse.json({ error: "Failed to get user tier info" }, { status: 500 })
  }
}
