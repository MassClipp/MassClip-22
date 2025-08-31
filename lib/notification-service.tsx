import { adminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"
import type { Notification } from "@/lib/types"

const resend = new Resend(process.env.RESEND_API_KEY)

export class NotificationService {
  static async createNotification(
    userId: string,
    type: "purchase" | "download",
    title: string,
    message: string,
    metadata?: any,
  ): Promise<void> {
    try {
      console.log(`[v0] Creating notification for user ${userId}: ${title}`)

      const notification: Omit<Notification, "id"> = {
        userId,
        type,
        title,
        message,
        read: false,
        createdAt: new Date().toISOString(),
        metadata: metadata || {},
      }

      const docRef = await adminDb.collection("notifications").add(notification)
      console.log(`[v0] Notification created with ID: ${docRef.id}`)

      const createdDoc = await docRef.get()
      if (createdDoc.exists) {
        console.log(`[v0] Notification verified in database:`, createdDoc.data())
      } else {
        console.error(`[v0] Notification creation failed - document not found`)
      }
    } catch (error) {
      console.error(`[v0] Error creating notification:`, error)
      throw error
    }
  }

  static async getUserNotifications(userId: string, limit = 20): Promise<Notification[]> {
    try {
      console.log(`[v0] Fetching notifications for user ${userId}`)

      const snapshot = await adminDb
        .collection("notifications")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get()

      const notifications: Notification[] = []
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
        } as Notification)
      })

      console.log(`[v0] Found ${notifications.length} notifications for user ${userId}`)
      return notifications
    } catch (error) {
      console.error(`[v0] Error fetching notifications:`, error)
      return []
    }
  }

  static async markAsRead(notificationId: string): Promise<void> {
    try {
      console.log(`[v0] Marking notification ${notificationId} as read`)

      await adminDb.collection("notifications").doc(notificationId).update({
        read: true,
        readAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error(`[v0] Error marking notification as read:`, error)
      throw error
    }
  }

  static async markAllAsRead(userId: string): Promise<void> {
    try {
      console.log(`[v0] Marking all notifications as read for user ${userId}`)

      const snapshot = await adminDb
        .collection("notifications")
        .where("userId", "==", userId)
        .where("read", "==", false)
        .get()

      const batch = adminDb.batch()
      snapshot.forEach((doc) => {
        batch.update(doc.ref, {
          read: true,
          readAt: new Date().toISOString(),
        })
      })

      await batch.commit()
      console.log(`[v0] Marked ${snapshot.size} notifications as read`)
    } catch (error) {
      console.error(`[v0] Error marking all notifications as read:`, error)
      throw error
    }
  }

  static async notifyPurchase(
    creatorId: string,
    creatorEmail: string,
    creatorName: string,
    bundleId: string,
    bundleTitle: string,
    amount: number,
    currency = "USD",
  ): Promise<void> {
    try {
      console.log(`[v0] Sending purchase notification to creator ${creatorId}`)

      const earnings = (amount * 0.8).toFixed(2) // Assuming 80% creator share

      // Create in-app notification
      await this.createNotification(
        creatorId,
        "purchase",
        "🎉 Bundle Purchased!",
        `Congratulations! Someone just bought your "${bundleTitle}" bundle. You earned $${earnings}!`,
        {
          bundleId,
          bundleTitle,
          amount,
          earnings: Number.parseFloat(earnings),
          currency,
        },
      )

      // Send email notification
      if (creatorEmail) {
        await resend.emails.send({
          from: "MassClip <notifications@massclip.app>",
          to: creatorEmail,
          subject: "🎉 Your bundle was purchased!",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Congratulations, ${creatorName}!</h2>
              <p>Great news! Someone just purchased your bundle:</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0;">${bundleTitle}</h3>
                <p style="margin: 0; color: #059669; font-size: 18px; font-weight: bold;">You earned: $${earnings} ${currency}</p>
              </div>
              <p>Keep creating amazing content! Your fans love what you do.</p>
              <p>Best regards,<br>The MassClip Team</p>
            </div>
          `,
        })
        console.log(`[v0] Purchase email sent to ${creatorEmail}`)
      }
    } catch (error) {
      console.error(`[v0] Error sending purchase notification:`, error)
      // Don't throw - we don't want to fail the purchase if notifications fail
    }
  }

  static async notifyDownload(
    creatorId: string,
    creatorEmail: string,
    creatorName: string,
    bundleId: string,
    bundleTitle: string,
  ): Promise<void> {
    try {
      console.log(`[v0] Sending download notification to creator ${creatorId}`)

      console.log(`[v0] Download notification details:`, {
        creatorId,
        creatorEmail,
        bundleId,
        bundleTitle,
      })

      // Create in-app notification
      await this.createNotification(
        creatorId,
        "download",
        "📥 Bundle Downloaded!",
        `Someone just downloaded your "${bundleTitle}" bundle!`,
        {
          bundleId,
          bundleTitle,
        },
      )

      // Send email notification
      if (creatorEmail) {
        await resend.emails.send({
          from: "MassClip <notifications@massclip.app>",
          to: creatorEmail,
          subject: "📥 Your bundle was downloaded!",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Your content is being enjoyed!</h2>
              <p>Hi ${creatorName},</p>
              <p>Someone just downloaded your bundle:</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0;">${bundleTitle}</h3>
              </div>
              <p>Your content is making an impact! Keep up the great work.</p>
              <p>Best regards,<br>The MassClip Team</p>
            </div>
          `,
        })
        console.log(`[v0] Download email sent to ${creatorEmail}`)
      }
    } catch (error) {
      console.error(`[v0] Error sending download notification:`, error)
      // Don't throw - we don't want to fail the download if notifications fail
    }
  }
}
