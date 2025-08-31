import { adminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export interface Notification {
  id: string
  userId: string // The user who should receive the notification
  type: "purchase" | "download" | "system"
  title: string
  message: string
  data?: {
    bundleId?: string
    bundleTitle?: string
    buyerName?: string
    amount?: number
    currency?: string
    downloadCount?: number
    contentTitle?: string
  }
  read: boolean
  createdAt: Date
  updatedAt: Date
}

export interface EmailNotification {
  to: string
  subject: string
  html: string
  type: "purchase" | "download"
}

export class NotificationService {
  /**
   * Create a new notification for a user
   */
  static async createNotification(notification: Omit<Notification, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const now = new Date()
      const notificationData: Omit<Notification, "id"> = {
        ...notification,
        createdAt: now,
        updatedAt: now,
      }

      const docRef = await adminDb.collection("notifications").add(notificationData)
      console.log(`✅ [Notifications] Created notification: ${docRef.id} for user ${notification.userId}`)
      return docRef.id
    } catch (error) {
      console.error("❌ [Notifications] Error creating notification:", error)
      throw error
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(userId: string, limit = 20): Promise<Notification[]> {
    try {
      const snapshot = await adminDb
        .collection("notifications")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get()

      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Notification,
      )
    } catch (error) {
      console.error("❌ [Notifications] Error fetching notifications:", error)
      return []
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await adminDb.collection("notifications").doc(notificationId).update({
        read: true,
        updatedAt: new Date(),
      })
      console.log(`✅ [Notifications] Marked notification as read: ${notificationId}`)
    } catch (error) {
      console.error("❌ [Notifications] Error marking notification as read:", error)
      throw error
    }
  }

  /**
   * Mark all notifications as read for a user
   */
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
      console.log(`✅ [Notifications] Marked all notifications as read for user: ${userId}`)
    } catch (error) {
      console.error("❌ [Notifications] Error marking all notifications as read:", error)
      throw error
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const snapshot = await adminDb
        .collection("notifications")
        .where("userId", "==", userId)
        .where("read", "==", false)
        .get()

      return snapshot.size
    } catch (error) {
      console.error("❌ [Notifications] Error getting unread count:", error)
      return 0
    }
  }

  /**
   * Create a purchase notification for the creator
   */
  static async createPurchaseNotification(data: {
    creatorId: string
    bundleTitle: string
    buyerName: string
    amount: number
    currency: string
    bundleId: string
  }): Promise<void> {
    try {
      const { creatorId, bundleTitle, buyerName, amount, currency, bundleId } = data

      await this.createNotification({
        userId: creatorId,
        type: "purchase",
        title: "New Purchase!",
        message: `Congratulations! Someone purchased "${bundleTitle}" for $${amount.toFixed(2)}`,
        data: {
          bundleId,
          bundleTitle,
          buyerName,
          amount,
          currency,
        },
        read: false,
      })

      console.log(`✅ [Notifications] Created purchase notification for creator: ${creatorId}`)
    } catch (error) {
      console.error("❌ [Notifications] Error creating purchase notification:", error)
    }
  }

  /**
   * Create a download notification for the creator
   */
  static async createDownloadNotification(data: {
    creatorId: string
    contentTitle: string
    downloadCount?: number
  }): Promise<void> {
    try {
      const { creatorId, contentTitle, downloadCount } = data

      await this.createNotification({
        userId: creatorId,
        type: "download",
        title: "Content Downloaded!",
        message: `Someone downloaded your video "${contentTitle}"`,
        data: {
          contentTitle,
          downloadCount,
        },
        read: false,
      })

      console.log(`✅ [Notifications] Created download notification for creator: ${creatorId}`)
    } catch (error) {
      console.error("❌ [Notifications] Error creating download notification:", error)
    }
  }

  /**
   * Send email notification
   */
  static async sendEmailNotification(emailData: EmailNotification): Promise<boolean> {
    try {
      const result = await resend.emails.send({
        from: "MassClip <notifications@massclip.pro>",
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
      })

      if (result.error) {
        console.error(`❌ [Notifications] Failed to send email:`, result.error)
        return false
      }

      console.log(`✅ [Notifications] Email sent successfully to ${emailData.to}`)
      return true
    } catch (error) {
      console.error("❌ [Notifications] Error sending email:", error)
      return false
    }
  }

  /**
   * Check if user has unsubscribed from notification emails
   */
  static async isUserUnsubscribed(email: string): Promise<boolean> {
    try {
      // Check drip campaign unsubscribe status
      const dripSnapshot = await adminDb.collection("dripCampaigns").where("email", "==", email).get()
      if (!dripSnapshot.empty) {
        const dripData = dripSnapshot.docs[0].data()
        if (dripData.unsubscribed) return true
      }

      // Check behavioral email unsubscribe status
      const behavioralSnapshot = await adminDb.collection("behavioralEmails").where("email", "==", email).get()
      if (!behavioralSnapshot.empty) {
        const behavioralData = behavioralSnapshot.docs[0].data()
        if (behavioralData.unsubscribed) return true
      }

      // Check notification-specific unsubscribe status
      const notificationSnapshot = await adminDb.collection("notificationPreferences").where("email", "==", email).get()
      if (!notificationSnapshot.empty) {
        const notificationData = notificationSnapshot.docs[0].data()
        if (notificationData.unsubscribed) return true
      }

      return false
    } catch (error) {
      console.error("❌ [Notifications] Error checking unsubscribe status:", error)
      return false // Default to allowing emails if check fails
    }
  }

  /**
   * Unsubscribe user from notification emails
   */
  static async unsubscribeFromNotifications(email: string): Promise<void> {
    try {
      await adminDb.collection("notificationPreferences").doc(email).set(
        {
          email,
          unsubscribed: true,
          unsubscribedAt: new Date(),
          purchaseNotifications: false,
          downloadNotifications: false,
        },
        { merge: true },
      )

      console.log(`✅ [Notifications] Unsubscribed user from notifications: ${email}`)
    } catch (error) {
      console.error("❌ [Notifications] Error unsubscribing user from notifications:", error)
    }
  }

  /**
   * Send purchase email notification to creator (with unsubscribe check)
   */
  static async sendPurchaseEmail(data: {
    creatorEmail: string
    creatorName: string
    bundleTitle: string
    buyerName: string
    amount: number
    currency: string
  }): Promise<void> {
    try {
      const { creatorEmail, creatorName, bundleTitle, buyerName, amount, currency } = data

      // Check if user has unsubscribed
      const isUnsubscribed = await this.isUserUnsubscribed(creatorEmail)
      if (isUnsubscribed) {
        console.log(`⏭️ [Notifications] Skipping purchase email - user unsubscribed: ${creatorEmail}`)
        return
      }

      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>New Purchase - ${bundleTitle}</title>
          </head>
          <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #dc2626; margin-bottom: 20px;">🎉 Congratulations! You made a sale!</h1>
              
              <p>Hi ${creatorName},</p>
              
              <p>Great news! Someone just purchased your bundle <strong>"${bundleTitle}"</strong>.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Purchase Details:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li><strong>Bundle:</strong> ${bundleTitle}</li>
                  <li><strong>Amount:</strong> $${amount.toFixed(2)} ${currency.toUpperCase()}</li>
                  <li><strong>Buyer:</strong> ${buyerName}</li>
                  <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
                </ul>
              </div>
              
              <p>Your earnings will be processed and sent to your connected Stripe account according to your payout schedule.</p>
              
              <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/dashboard/earnings" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Earnings Dashboard</a></p>
              
              <p>Keep up the great work!</p>
              
              <p>Best regards,<br>The MassClip Team</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
              <p style="font-size: 12px; color: #6b7280; text-align: center;">
                This email was sent because you received a purchase on MassClip. 
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/dashboard/settings" style="color: #6b7280;">Manage notification preferences</a> | 
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent(creatorEmail)}" style="color: #6b7280;">Unsubscribe</a>
              </p>
            </div>
          </body>
        </html>
      `

      await this.sendEmailNotification({
        to: creatorEmail,
        subject: `🎉 New Purchase: ${bundleTitle} - $${amount.toFixed(2)}`,
        html,
        type: "purchase",
      })

      console.log(`✅ [Notifications] Purchase email sent to creator: ${creatorEmail}`)
    } catch (error) {
      console.error("❌ [Notifications] Error sending purchase email:", error)
    }
  }

  /**
   * Send download email notification to creator (with unsubscribe check)
   */
  static async sendDownloadEmail(data: {
    creatorEmail: string
    creatorName: string
    contentTitle: string
    downloadCount?: number
  }): Promise<void> {
    try {
      const { creatorEmail, creatorName, contentTitle, downloadCount } = data

      // Check if user has unsubscribed
      const isUnsubscribed = await this.isUserUnsubscribed(creatorEmail)
      if (isUnsubscribed) {
        console.log(`⏭️ [Notifications] Skipping download email - user unsubscribed: ${creatorEmail}`)
        return
      }

      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>Content Downloaded - ${contentTitle}</title>
          </head>
          <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #059669; margin-bottom: 20px;">📥 Your content was downloaded!</h1>
              
              <p>Hi ${creatorName},</p>
              
              <p>Someone just downloaded your video <strong>"${contentTitle}"</strong>.</p>
              
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
                <h3 style="margin-top: 0; color: #065f46;">Download Details:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li><strong>Content:</strong> ${contentTitle}</li>
                  <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
                  ${downloadCount ? `<li><strong>Total Downloads:</strong> ${downloadCount}</li>` : ""}
                </ul>
              </div>
              
              <p>This means your content is being discovered and enjoyed by your audience. Keep creating amazing content!</p>
              
              <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/dashboard" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a></p>
              
              <p>Best regards,<br>The MassClip Team</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
              <p style="font-size: 12px; color: #6b7280; text-align: center;">
                This email was sent because your content was downloaded on MassClip. 
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/dashboard/settings" style="color: #6b7280;">Manage notification preferences</a> | 
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent(creatorEmail)}" style="color: #6b7280;">Unsubscribe</a>
              </p>
            </div>
          </body>
        </html>
      `

      await this.sendEmailNotification({
        to: creatorEmail,
        subject: `📥 Your video "${contentTitle}" was downloaded!`,
        html,
        type: "download",
      })

      console.log(`✅ [Notifications] Download email sent to creator: ${creatorEmail}`)
    } catch (error) {
      console.error("❌ [Notifications] Error sending download email:", error)
    }
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  static async cleanupOldNotifications(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const snapshot = await adminDb.collection("notifications").where("createdAt", "<", thirtyDaysAgo).get()

      const batch = adminDb.batch()
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      await batch.commit()
      console.log(`✅ [Notifications] Cleaned up ${snapshot.size} old notifications`)
    } catch (error) {
      console.error("❌ [Notifications] Error cleaning up old notifications:", error)
    }
  }
}
