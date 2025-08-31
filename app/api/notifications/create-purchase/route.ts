import { type NextRequest, NextResponse } from "next/server"
import { NotificationService } from "@/lib/notification-service"

export async function POST(request: NextRequest) {
  try {
    const { creatorId, bundleName, amount, buyerId } = await request.json()

    console.log(`[v0] API: Creating purchase notification for creator: ${creatorId}`)

    if (!creatorId || !bundleName || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await NotificationService.createPurchaseNotification(creatorId, bundleName, amount, buyerId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in create-purchase API:", error)
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
  }
}
