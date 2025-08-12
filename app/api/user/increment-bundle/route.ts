import { NextResponse, type NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { incrementUserBundles, canUserCreateBundle } from "@/lib/user-tier-service"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { uid } = await getAuthenticatedUser(request.headers)

    // Check if user can create bundle
    const canCreate = await canUserCreateBundle(uid)
    if (!canCreate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: canCreate.reason || "Bundle creation not allowed",
        },
        { status: 403 },
      )
    }

    await incrementUserBundles(uid)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("❌ [/api/user/increment-bundle] Error:", error?.message || error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to increment bundle",
      },
      { status: 400 },
    )
  }
}
