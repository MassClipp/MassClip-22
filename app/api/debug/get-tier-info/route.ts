import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { getUserTierInfo } from "@/lib/user-tier-service"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(token)

    if (!decodedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userUid = decodedToken.uid

    console.log("[v0] Getting tier info for user:", userUid)

    const tierInfo = await getUserTierInfo(userUid)

    console.log("[v0] Tier info result:", tierInfo)

    return NextResponse.json(tierInfo)
  } catch (error: any) {
    console.error("[v0] Error getting tier info:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
