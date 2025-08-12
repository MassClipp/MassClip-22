import { type NextRequest, NextResponse } from "next/server"
import { getFreeUserLimits } from "@/lib/free-users-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uid = searchParams.get("uid")

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 })
    }

    console.log("🔄 Getting free user limits for:", uid.substring(0, 8) + "...")

    const limits = await getFreeUserLimits(uid)

    console.log("✅ Retrieved free user limits:", limits)

    return NextResponse.json({
      success: true,
      limits,
    })
  } catch (error: any) {
    console.error("❌ Error getting free user limits:", error)
    return NextResponse.json(
      {
        error: "Failed to get free user limits",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
