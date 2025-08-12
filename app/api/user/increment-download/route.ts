import { NextResponse, type NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { incrementUserDownloads, canUserDownload } from "@/lib/user-tier-service"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { uid } = await getAuthenticatedUser(request.headers)

    // Check if user can download
    const canDownload = await canUserDownload(uid)
    if (!canDownload.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: canDownload.reason || "Download not allowed",
        },
        { status: 403 },
      )
    }

    await incrementUserDownloads(uid)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("❌ [/api/user/increment-download] Error:", error?.message || error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to increment download",
      },
      { status: 400 },
    )
  }
}
