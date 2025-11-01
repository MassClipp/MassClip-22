import { type NextRequest, NextResponse } from "next/server"
import { getUserTierInfo } from "@/lib/user-tier-service"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tierInfo = await getUserTierInfo(session.user.id)

    return NextResponse.json({
      success: true,
      tierInfo,
    })
  } catch (error) {
    console.error("❌ Error getting tier info:", error)
    return NextResponse.json({ error: "Failed to get tier info" }, { status: 500 })
  }
}
