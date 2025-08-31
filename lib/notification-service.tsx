import { adminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export interface Notification {
  id?: string
  userId: string
  type: "download" | "purchase"
  title: string
  message: string
  bundleName: string
  amount?: number
  read: boolean
  createdAt: Date
}

export class NotificationService {
  static async createDownloadNotification(creatorId: string, bundleName: string, downloaderId?: string) {
    try {
      console.log("[v0] Creating download notification for creator:", creatorId)

      // Create notification document
      const notification: Notification = {
        userId: creatorId,
        type: "download",
        title: "Content Downloaded!",
        message: `Someone downloaded your video "${bundleName}"`,
        bundleName,
        read: false,
        createdAt: new Date(),
      }

      // Add to notifications collection
      const notificationRef = await adminDb.collection("notifications").add(notification)
      console.log("[v0] Notification created with ID:", notificationRef.id)

      // Log to downloads collection for tracking
      await adminDb.collection("downloads").add({
        creatorId,
        bundleName,
        downloaderId: downloaderId || "anonymous",
        timestamp: new Date(),
        notificationId: notificationRef.id,
      })

      // Get creator's email for notification
      const creatorDoc = await adminDb.collection("users").doc(creatorId).get()
      if (creatorDoc.exists) {
        const creatorData = creatorDoc.data()
        const creatorEmail = creatorData?.email

        if (creatorEmail) {
          console.log("[v0] Sending download email to:", creatorEmail)
          await this.sendDownloadEmail(creatorEmail, bundleName)
        }
      }

      return notificationRef.id
    } catch (error) {
      console.error("[v0] Error creating download notification:", error)
      throw error
    }
  }

  static async createPurchaseNotification(creatorId: string, bundleName: string, amount: number, buyerId?: string) {
    try {
      console.log("[v0] Creating purchase notification for creator:", creatorId)

      const notification: Notification = {
        userId: creatorId,
        type: "purchase",
        title: "Bundle Purchased!",
        message: `Congrats! Someone purchased your bundle "${bundleName}" for $${amount}`,
        bundleName,
        amount,
        read: false,
        createdAt: new Date(),
      }

      const notificationRef = await adminDb.collection("notifications").add(notification)
      console.log("[v0] Purchase notification created with ID:", notificationRef.id)

      // Log to purchases collection for tracking
      await adminDb.collection("purchases").add({
        creatorId,
        bundleName,
        amount,
        buyerId: buyerId || "anonymous",
        timestamp: new Date(),
        notificationId: notificationRef.id,
      })

      // Get creator's email
      const creatorDoc = await adminDb.collection("users").doc(creatorId).get()
      if (creatorDoc.exists) {
        const creatorData = creatorDoc.data()
        const creatorEmail = creatorData?.email

        if (creatorEmail) {
          console.log("[v0] Sending purchase email to:", creatorEmail)
          await this.sendPurchaseEmail(creatorEmail, bundleName, amount)
        }
      }

      return notificationRef.id
    } catch (error) {
      console.error("[v0] Error creating purchase notification:", error)
      throw error
    }
  }

  private static async sendDownloadEmail(creatorEmail: string, bundleName: string) {
    try {
      await resend.emails.send({
        from: "MassClip <notifications@massclip.app>",
        to: creatorEmail,
        subject: "Someone downloaded your content!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Great news!</h2>
            <p>Someone just downloaded your video "<strong>${bundleName}</strong>"!</p>
            <p>Keep creating amazing content to get more downloads.</p>
            <p>Best regards,<br>The MassClip Team</p>
          </div>
        `,
      })
      console.log("[v0] Download email sent successfully")
    } catch (error) {
      console.error("[v0] Error sending download email:", error)
    }
  }

  private static async sendPurchaseEmail(creatorEmail: string, bundleName: string, amount: number) {
    try {
      await resend.emails.send({
        from: "MassClip <notifications@massclip.app>",
        to: creatorEmail,
        subject: "Congratulations! You made a sale!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #22c55e;">🎉 Congratulations!</h2>
            <p>Someone just purchased your bundle "<strong>${bundleName}</strong>" for <strong>$${amount}</strong>!</p>
            <p>You're earning money from your content. Keep up the great work!</p>
            <p>Best regards,<br>The MassClip Team</p>
          </div>
        `,
      })
      console.log("[v0] Purchase email sent successfully")
    } catch (error) {
      console.error("[v0] Error sending purchase email:", error)
    }
  }
}
