import { type NextRequest, NextResponse } from "next/server"
import { getUserTierInfo } from "@/lib/user-tier-service"
import { auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    const tierInfo = await getUserTierInfo(uid)

    return NextResponse.json(tierInfo)
  } catch (error) {
    console.error("Error getting tier info:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
