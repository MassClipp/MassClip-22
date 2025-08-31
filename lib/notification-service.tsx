import { adminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export interface NotificationData {
  id?: string
  type: "purchase" | "download"
  title: string
  message: string
  creatorId: string
  amount?: number
  bundleName?: string
  isRead: boolean
  createdAt: Date
}

export class NotificationService {
  static async createDownloadNotification(creatorId: string, bundleName: string, downloaderId?: string): Promise<void> {
    try {
      console.log(`[v0] Creating download notification for creator: ${creatorId}, bundle: ${bundleName}`)

      // Create notification document
      const notification: NotificationData = {
        type: "download",
        title: "Video Downloaded!",
        message: `Someone downloaded your video "${bundleName}"`,
        creatorId,
        bundleName,
        isRead: false,
        createdAt: new Date(),
      }

      // Save to Firestore
      await adminDb.collection("notifications").add({
        ...notification,
        createdAt: adminDb.FieldValue.serverTimestamp(),
      })

      console.log(`[v0] Download notification created successfully`)

      // Send email notification
      await this.sendDownloadEmail(creatorId, bundleName)
    } catch (error) {
      console.error("[v0] Error creating download notification:", error)
    }
  }

  static async createPurchaseNotification(
    creatorId: string,
    bundleName: string,
    amount: number,
    buyerId?: string,
  ): Promise<void> {
    try {
      console.log(
        `[v0] Creating purchase notification for creator: ${creatorId}, bundle: ${bundleName}, amount: $${amount}`,
      )

      // Create notification document
      const notification: NotificationData = {
        type: "purchase",
        title: "Bundle Sold!",
        message: `Congrats! You earned $${amount} from "${bundleName}"`,
        creatorId,
        amount,
        bundleName,
        isRead: false,
        createdAt: new Date(),
      }

      // Save to Firestore
      await adminDb.collection("notifications").add({
        ...notification,
        createdAt: adminDb.FieldValue.serverTimestamp(),
      })

      console.log(`[v0] Purchase notification created successfully`)

      // Send email notification
      await this.sendPurchaseEmail(creatorId, bundleName, amount)
    } catch (error) {
      console.error("[v0] Error creating purchase notification:", error)
    }
  }

  private static async sendDownloadEmail(creatorId: string, bundleName: string): Promise<void> {
    try {
      // Get creator email
      const creatorDoc = await adminDb.collection("users").doc(creatorId).get()
      if (!creatorDoc.exists) {
        console.log(`[v0] Creator not found: ${creatorId}`)
        return
      }

      const creatorData = creatorDoc.data()
      const creatorEmail = creatorData?.email

      if (!creatorEmail) {
        console.log(`[v0] No email found for creator: ${creatorId}`)
        return
      }

      console.log(`[v0] Sending download email to: ${creatorEmail}`)

      await resend.emails.send({
        from: "MassClip <notifications@massclip.app>",
        to: creatorEmail,
        subject: "🎉 Someone downloaded your video!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Great news!</h2>
            <p>Someone just downloaded your video <strong>"${bundleName}"</strong>!</p>
            <p>Keep creating amazing content to get more downloads.</p>
            <p>Best regards,<br>The MassClip Team</p>
          </div>
        `,
      })

      console.log(`[v0] Download email sent successfully`)
    } catch (error) {
      console.error("[v0] Error sending download email:", error)
    }
  }

  private static async sendPurchaseEmail(creatorId: string, bundleName: string, amount: number): Promise<void> {
    try {
      // Get creator email
      const creatorDoc = await adminDb.collection("users").doc(creatorId).get()
      if (!creatorDoc.exists) {
        console.log(`[v0] Creator not found: ${creatorId}`)
        return
      }

      const creatorData = creatorDoc.data()
      const creatorEmail = creatorData?.email

      if (!creatorEmail) {
        console.log(`[v0] No email found for creator: ${creatorId}`)
        return
      }

      console.log(`[v0] Sending purchase email to: ${creatorEmail}`)

      await resend.emails.send({
        from: "MassClip <notifications@massclip.app>",
        to: creatorEmail,
        subject: "💰 Congratulations! You made a sale!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Congratulations! 🎉</h2>
            <p>You just earned <strong>$${amount}</strong> from the sale of <strong>"${bundleName}"</strong>!</p>
            <p>Keep up the great work creating amazing content.</p>
            <p>Best regards,<br>The MassClip Team</p>
          </div>
        `,
      })

      console.log(`[v0] Purchase email sent successfully`)
    } catch (error) {
      console.error("[v0] Error sending purchase email:", error)
    }
  }

  static async getNotifications(creatorId: string, limit = 20): Promise<NotificationData[]> {
    try {
      const snapshot = await adminDb
        .collection("notifications")
        .where("creatorId", "==", creatorId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get()

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as NotificationData[]
    } catch (error) {
      console.error("[v0] Error getting notifications:", error)
      return []
    }
  }

  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await adminDb.collection("notifications").doc(notificationId).update({
        isRead: true,
      })
    } catch (error) {
      console.error("[v0] Error marking notification as read:", error)
    }
  }
}
