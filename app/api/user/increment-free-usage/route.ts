import { type NextRequest, NextResponse } from "next/server"
import { incrementFreeUserDownloads, incrementFreeUserBundles } from "@/lib/free-users-service"
import { type } from "os"

export async function POST(request: NextRequest) {
  try {
    const { uid, type } = await request.json()

    if (!uid || !type) {
      return NextResponse.json({ error: "Missing uid or type" }, { status: 400 })
    }

    if (type !== "download" && type !== "bundle") {
      return NextResponse.json({ error: "Type must be 'download' or 'bundle'" }, { status: 400 })
    }

    console.log(`🔄 Incrementing ${type} for freeUser:`, uid.substring(0, 8) + "...")

    if (type === "download") {
      await incrementFreeUserDownloads(uid)
    } else {
      await incrementFreeUserBundles(uid)
    }

    console.log(`✅ Successfully incremented ${type} for freeUser`)

    return NextResponse.json({
      success: true,
      message: `${type} incremented successfully`,
    })
  } catch (error: any) {
    console.error(`❌ Error incrementing free user ${type}:`, error)
    return NextResponse.json(
      {
        error: `Failed to increment ${type}`,
        details: error.message,
      },
      { status: 500 },
    )
  }
}
