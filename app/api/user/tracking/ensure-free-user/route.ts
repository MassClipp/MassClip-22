import { NextResponse, type NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { UserTrackingService } from "@/lib/user-tracking-service"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Securely identify the current Firebase user via ID token
    const { uid, email } = await getAuthenticatedUser(request.headers)

    // Derive IP metadata (best effort)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined

    const result = await UserTrackingService.ensureFreeUserForNonPro(uid, email || "", {
      ipAddress: ip,
    })

    return NextResponse.json({ success: true, ensured: result.ensured, reason: result.reason })
  } catch (error: any) {
    const message = error?.message || "Failed to ensure free user"
    console.error("❌ [/api/user/tracking/ensure-free-user] Error:", message)
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
