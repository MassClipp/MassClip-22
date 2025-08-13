import { type NextRequest, NextResponse } from "next/server"
import { incrementUserDownloads } from "@/lib/user-tier-service"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await incrementUserDownloads(session.user.id)

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
    console.error("❌ Error incrementing downloads:", error)
    return NextResponse.json({ error: "Failed to increment downloads" }, { status: 500 })
  }
}
