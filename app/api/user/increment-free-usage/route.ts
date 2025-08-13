import { type NextRequest, NextResponse } from "next/server"
import { incrementFreeUserDownloads, incrementFreeUserBundles, canUserAddVideoToBundle } from "@/lib/free-users-service"
import { verifyIdToken } from "firebase-admin/auth"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(idToken)
    const uid = decodedToken.uid

    const { type, currentVideoCount } = await request.json()

    if (type === "download") {
      const result = await incrementFreeUserDownloads(uid)
      return NextResponse.json({
        success: result.success,
        message: result.success ? "Download count incremented" : result.reason,
        reason: result.reason,
      })
    } else if (type === "bundle") {
      const result = await incrementFreeUserBundles(uid)
      return NextResponse.json({
        success: result.success,
        message: result.success ? "Bundle count incremented" : result.reason,
        reason: result.reason,
      })
    } else if (type === "check-video-limit") {
      const result = await canUserAddVideoToBundle(uid, currentVideoCount || 0)
      return NextResponse.json({
        success: result.allowed,
        message: result.allowed ? "Video can be added" : result.reason,
        reason: result.reason,
      })
    } else {
      return NextResponse.json(
        { error: "Invalid type. Use 'download', 'bundle', or 'check-video-limit'" },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("❌ Error incrementing free user usage:", error)
    return NextResponse.json({ error: "Failed to increment usage" }, { status: 500 })
  }
}
