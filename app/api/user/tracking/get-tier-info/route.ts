import { NextResponse, type NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { UserTrackingService } from "@/lib/user-tracking-service"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { uid } = await getAuthenticatedUser(request.headers)
    const info = await UserTrackingService.getUserTierInfo(uid)
    return NextResponse.json({ success: true, data: info })
  } catch (error: any) {
    console.error("❌ [/api/user/tracking/get-tier-info] Error:", error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to get tier info" }, { status: 400 })
  }
}
