import { type NextRequest, NextResponse } from "next/server"
import { NotificationService } from "@/lib/notification-service"

export async function POST(request: NextRequest) {
  try {
    const { creatorId, bundleName, downloaderId } = await request.json()

    console.log(`[v0] API: Creating download notification for creator: ${creatorId}`)

    if (!creatorId || !bundleName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await NotificationService.createDownloadNotification(creatorId, bundleName, downloaderId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in create-download API:", error)
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
  }
}
