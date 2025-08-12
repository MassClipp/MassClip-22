import { NextResponse, type NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { cancelMembership } from "@/lib/memberships-service"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { uid } = await getAuthenticatedUser(request.headers)

    await cancelMembership(uid)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("❌ [/api/user/cancel-membership] Error:", error?.message || error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to cancel membership",
      },
      { status: 400 },
    )
  }
}
