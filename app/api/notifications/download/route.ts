import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { NotificationService } from "@/lib/notification-service"

export async function POST(request: NextRequest) {
  try {
    const { videoId, creatorId, downloaderId, contentTitle } = await request.json()

    if (!videoId || !creatorId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`🔔 [Download Notification] Processing download notification:`, {
      videoId,
      creatorId,
      downloaderId,
      contentTitle,
    })

    // Get video/content details if title not provided
    let finalContentTitle = contentTitle
    let downloadCount = 0

    if (!finalContentTitle) {
      try {
        // Try to get content title from uploads collection
        const videoDoc = await adminDb.collection("uploads").doc(videoId).get()
        if (videoDoc.exists) {
          const videoData = videoDoc.data()!
          finalContentTitle = videoData.title || videoData.name || videoData.filename || "Untitled Content"
          downloadCount = (videoData.downloadCount || 0) + 1
        }
      } catch (error) {
        console.warn(`⚠️ [Download Notification] Could not fetch video details:`, error)
        finalContentTitle = "Your Content"
      }
    }

    // Get creator details for email notification
    let creatorData = { name: "Creator", email: "" }
    try {
      const creatorDoc = await adminDb.collection("users").doc(creatorId).get()
      if (creatorDoc.exists) {
        const creator = creatorDoc.data()!
        creatorData = {
          name: creator.displayName || creator.name || creator.username || "Creator",
          email: creator.email || "",
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Download Notification] Could not fetch creator details:`, error)
    }

    // Create in-app notification
    try {
      await NotificationService.createDownloadNotification({
        creatorId,
        contentTitle: finalContentTitle,
        downloadCount,
      })
      console.log(`✅ [Download Notification] In-app notification created for creator: ${creatorId}`)
    } catch (error) {
      console.error(`❌ [Download Notification] Failed to create in-app notification:`, error)
    }

    // Send email notification if creator email is available
    if (creatorData.email) {
      try {
        await NotificationService.sendDownloadEmail({
          creatorEmail: creatorData.email,
          creatorName: creatorData.name,
          contentTitle: finalContentTitle,
          downloadCount,
        })
        console.log(`✅ [Download Notification] Email notification sent to creator: ${creatorData.email}`)
      } catch (error) {
        console.error(`❌ [Download Notification] Failed to send email notification:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Download notification processed successfully",
    })
  } catch (error: any) {
    console.error("❌ [Download Notification] Error processing download notification:", error)
    return NextResponse.json(
      { error: "Failed to process download notification", details: error.message },
      { status: 500 },
    )
  }
}
