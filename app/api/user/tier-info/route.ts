import { type NextRequest, NextResponse } from "next/server"
import { getUserTierInfo } from "@/lib/user-tier-service"
import { verifyIdToken } from "firebase-admin/auth"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(idToken)
    const uid = decodedToken.uid

    const tierInfo = await getUserTierInfo(uid)

    return NextResponse.json({
      success: true,
      tierInfo,
    })
  } catch (error) {
    console.error("❌ Error getting user tier info:", error)
    return NextResponse.json({ error: "Failed to get user tier info" }, { status: 500 })
  }
}
