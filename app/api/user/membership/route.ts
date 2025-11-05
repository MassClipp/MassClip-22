import { NextResponse, type NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { ensureMembership, getTierInfo } from "@/lib/memberships-service"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { uid, email } = await getAuthenticatedUser(request.headers)
    await ensureMembership(uid, email)
    const info = await getTierInfo(uid)

    return NextResponse.json({ success: true, data: info })
  } catch (error: any) {
    console.error("❌ [/api/user/membership] Error:", error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to fetch membership" }, { status: 400 })
  }
}
