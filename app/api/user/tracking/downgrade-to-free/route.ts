import { NextResponse, type NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { UserTrackingService } from "@/lib/user-tracking-service"

/**
 * Soft downgrade endpoint: marks creatorProUsers as canceled and ensures freeUsers with free caps.
 */
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { uid, email } = await getAuthenticatedUser(request.headers)
    await UserTrackingService.downgradeToFree(uid, email || "")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("❌ [/api/user/tracking/downgrade-to-free] Error:", error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || "Downgrade failed" }, { status: 400 })
  }
}
