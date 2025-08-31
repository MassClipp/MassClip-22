import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { NotificationService } from "@/lib/notification-service"

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization token is required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    // Fetch notifications
    const notifications = await NotificationService.getUserNotifications(userId, limit)

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    })
  } catch (error: any) {
    console.error("❌ [Notifications API] Error fetching notifications:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch notifications",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization token is required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const body = await request.json()
    const { notificationId, markAllAsRead } = body

    if (markAllAsRead) {
      await NotificationService.markAllAsRead(userId)
    } else if (notificationId) {
      await NotificationService.markAsRead(notificationId)
    } else {
      return NextResponse.json({ error: "notificationId or markAllAsRead is required" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("❌ [Notifications API] Error updating notifications:", error)
    return NextResponse.json(
      {
        error: "Failed to update notifications",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
