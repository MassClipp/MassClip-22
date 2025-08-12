import { NextResponse, type NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { getUserTierInfo } from "@/lib/user-tier-service"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { uid } = await getAuthenticatedUser(request.headers)
    const tierInfo = await getUserTierInfo(uid)

    return NextResponse.json({ success: true, tierInfo })
  } catch (error: any) {
    console.error("❌ [/api/user/tier-info] Error:", error?.message || error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to get tier info",
      },
      { status: 400 },
    )
  }
}
