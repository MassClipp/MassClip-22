import { type NextRequest, NextResponse } from "next/server"
import { incrementUserBundles } from "@/lib/user-tier-service"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await incrementUserBundles(session.user.id)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          reason: result.reason,
        },
        { status: 403 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Error incrementing bundles:", error)
    return NextResponse.json({ error: "Failed to increment bundles" }, { status: 500 })
  }
}
