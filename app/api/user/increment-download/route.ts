import { type NextRequest, NextResponse } from "next/server"
import { incrementUserDownloads } from "@/lib/user-tier-service"
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

    await incrementUserDownloads(uid)

    return NextResponse.json({
      success: true,
      message: "Download count incremented",
    })
  } catch (error) {
    console.error("❌ Error incrementing download:", error)
    return NextResponse.json({ error: "Failed to increment download" }, { status: 500 })
  }
}
