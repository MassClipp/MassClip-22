import { NextResponse, type NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { UserTrackingService } from "@/lib/user-tracking-service"

/**
 * Soft upgrade endpoint: keeps freeUsers history and creates/merges creatorProUsers.
 * Expect the client (post-checkout success) to send stripeCustomerId and subscriptionId.
 */
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { uid, email } = await getAuthenticatedUser(request.headers)
    const body = await request.json().catch(() => ({}))
    const { stripeCustomerId, subscriptionId } = body || {}

    if (!stripeCustomerId || !subscriptionId) {
      return NextResponse.json({ success: false, error: "Missing stripeCustomerId or subscriptionId" }, { status: 400 })
    }

    await UserTrackingService.upgradeToCreatorPro(uid, String(stripeCustomerId), String(subscriptionId), email || "")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("❌ [/api/user/tracking/upgrade-to-pro] Error:", error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || "Upgrade failed" }, { status: 400 })
  }
}
