import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { NotificationService } from "@/lib/notification-service"

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    // Fetch notifications
    const notifications = await NotificationService.getUserNotifications(userId, limit)
    const unreadCount = await NotificationService.getUnreadCount(userId)

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    })
  } catch (error: any) {
    console.error("❌ [Notifications API] Error fetching notifications:", error)
    return NextResponse.json({ error: "Failed to fetch notifications", details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { action, notificationId } = await request.json()

    if (action === "mark_read" && notificationId) {
      await NotificationService.markAsRead(notificationId)
      return NextResponse.json({ success: true, message: "Notification marked as read" })
    }

    if (action === "mark_all_read") {
      await NotificationService.markAllAsRead(userId)
      return NextResponse.json({ success: true, message: "All notifications marked as read" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("❌ [Notifications API] Error processing request:", error)
    return NextResponse.json({ error: "Failed to process request", details: error.message }, { status: 500 })
  }
}
