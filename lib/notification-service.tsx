import { adminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"
import { type Notification, NotificationType, type CreateNotificationRequest } from "@/lib/types"

const resend = new Resend(process.env.RESEND_API_KEY)

export class NotificationService {
  // Create a new notification
  static async createNotification(request: CreateNotificationRequest): Promise<string> {
    try {
      const notificationData = {
        userId: request.userId,
        type: request.type,
        title: request.title,
        message: request.message,
        data: request.data || {},
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const docRef = await adminDb.collection("notifications").add(notificationData)
      console.log(`✅ [Notification Service] Created notification: ${docRef.id} for user: ${request.userId}`)

      return docRef.id
    } catch (error) {
      console.error("❌ [Notification Service] Error creating notification:", error)
      throw error
    }
  }

  // Get notifications for a user
  static async getUserNotifications(userId: string, limit = 20): Promise<Notification[]> {
    try {
      const snapshot = await adminDb
        .collection("notifications")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get()

      const notifications: Notification[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Notification[]

      return notifications
    } catch (error) {
      console.error("❌ [Notification Service] Error fetching notifications:", error)
      return []
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await adminDb.collection("notifications").doc(notificationId).update({
        read: true,
        updatedAt: new Date(),
      })
      console.log(`✅ [Notification Service] Marked notification as read: ${notificationId}`)
    } catch (error) {
      console.error("❌ [Notification Service] Error marking notification as read:", error)
      throw error
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const snapshot = await adminDb
        .collection("notifications")
        .where("userId", "==", userId)
        .where("read", "==", false)
        .get()

      const batch = adminDb.batch()
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          read: true,
          updatedAt: new Date(),
        })
      })

      await batch.commit()
      console.log(`✅ [Notification Service] Marked all notifications as read for user: ${userId}`)
    } catch (error) {
      console.error("❌ [Notification Service] Error marking all notifications as read:", error)
      throw error
    }
  }

  // Send email notification for bundle purchase
  static async sendPurchaseEmail(
    creatorEmail: string,
    creatorName: string,
    bundleTitle: string,
    amount: number,
    currency = "USD",
  ): Promise<void> {
    try {
      const formattedAmount = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amount)

      const emailHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>Bundle Purchase Notification</title>
          </head>
          <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
            <p>Hi ${creatorName},</p>
            <p>🎉 Great news! Someone just purchased your bundle "${bundleTitle}".</p>
            <p><strong>You earned: ${formattedAmount}</strong></p>
            <p>The payment will be processed and sent to your connected Stripe account according to your payout schedule.</p>
            <p><a href="https://www.massclip.pro/dashboard/earnings" style="color: #007BFF; text-decoration: underline;">View your earnings dashboard</a></p>
            <p>Keep creating amazing content!</p>
            <p>Best,<br>MassClip</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              If you no longer want to receive emails from MassClip, you can 
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent(creatorEmail)}" style="color: #999;">unsubscribe here</a>.
            </p>
          </body>
        </html>
      `

      const result = await resend.emails.send({
        from: "MassClip <contact@massclip.pro>",
        to: creatorEmail,
        subject: `💰 You made a sale! Someone bought "${bundleTitle}"`,
        html: emailHtml,
      })

      if (result.error) {
        console.error("❌ [Notification Service] Failed to send purchase email:", result.error)
      } else {
        console.log(`✅ [Notification Service] Purchase email sent to: ${creatorEmail}`)
      }
    } catch (error) {
      console.error("❌ [Notification Service] Error sending purchase email:", error)
    }
  }

  // Send email notification for bundle download
  static async sendDownloadEmail(creatorEmail: string, creatorName: string, bundleTitle: string): Promise<void> {
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>Bundle Download Notification</title>
          </head>
          <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
            <p>Hi ${creatorName},</p>
            <p>📥 Someone just downloaded your bundle "${bundleTitle}"!</p>
            <p>Your content is being enjoyed by your audience. Keep up the great work!</p>
            <p><a href="https://www.massclip.pro/dashboard" style="color: #007BFF; text-decoration: underline;">View your dashboard</a></p>
            <p>Best,<br>MassClip</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              If you no longer want to receive emails from MassClip, you can 
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent(creatorEmail)}" style="color: #999;">unsubscribe here</a>.
            </p>
          </body>
        </html>
      `

      const result = await resend.emails.send({
        from: "MassClip <contact@massclip.pro>",
        to: creatorEmail,
        subject: `📥 Your bundle "${bundleTitle}" was downloaded!`,
        html: emailHtml,
      })

      if (result.error) {
        console.error("❌ [Notification Service] Failed to send download email:", result.error)
      } else {
        console.log(`✅ [Notification Service] Download email sent to: ${creatorEmail}`)
      }
    } catch (error) {
      console.error("❌ [Notification Service] Error sending download email:", error)
    }
  }

  // Create purchase notification and send email
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
      const formattedAmount = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amount)

      // Create in-app notification
      await this.createNotification({
        userId: creatorId,
        type: NotificationType.BUNDLE_PURCHASED,
        title: "Bundle Purchased! 🎉",
        message: `Someone bought "${bundleTitle}" - You earned ${formattedAmount}`,
        data: {
          bundleId,
          bundleTitle,
          amount,
          currency,
        },
      })

      // Send email notification
      await this.sendPurchaseEmail(creatorEmail, creatorName, bundleTitle, amount, currency)

      console.log(`✅ [Notification Service] Purchase notifications sent for bundle: ${bundleTitle}`)
    } catch (error) {
      console.error("❌ [Notification Service] Error sending purchase notifications:", error)
    }
  }

  // Create download notification and send email
  static async notifyDownload(
    creatorId: string,
    creatorEmail: string,
    creatorName: string,
    bundleId: string,
    bundleTitle: string,
  ): Promise<void> {
    try {
      // Create in-app notification
      await this.createNotification({
        userId: creatorId,
        type: NotificationType.BUNDLE_DOWNLOADED,
        title: "Bundle Downloaded! 📥",
        message: `Someone downloaded "${bundleTitle}"`,
        data: {
          bundleId,
          bundleTitle,
        },
      })

      // Send email notification
      await this.sendDownloadEmail(creatorEmail, creatorName, bundleTitle)

      console.log(`✅ [Notification Service] Download notifications sent for bundle: ${bundleTitle}`)
    } catch (error) {
      console.error("❌ [Notification Service] Error sending download notifications:", error)
    }
  }
}
