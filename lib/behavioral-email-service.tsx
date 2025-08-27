import { adminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export interface BehavioralEmailUser {
  uid: string
  email: string
  displayName?: string
  lastStripeEmailSent?: Date
  lastBundleEmailSent?: Date
  lastFreeContentEmailSent?: Date
  lastContentEmailSent?: Date
  unsubscribed: boolean
}

export interface BehavioralEmailTemplate {
  type: "stripe" | "bundles" | "free-content" | "content"
  subject: string
  html: string
  resendAfterDays: number
}

const BEHAVIORAL_EMAIL_TEMPLATES: BehavioralEmailTemplate[] = [
  {
    type: "stripe",
    subject: "Set up your payments",
    resendAfterDays: 7,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Set up your payments</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hi there,</p>
          <p>We noticed your Stripe account is not connected. Without Stripe, MassClip cannot send payouts when people purchase your content.</p>
          <p>It only takes a couple of minutes to finish this step. Once it is connected, you will be ready to receive payments directly.</p>
          <p><a href="https://www.massclip.pro/dashboard/earnings" style="color: #007BFF; text-decoration: underline;">You can connect your Stripe account here</a>.</p>
          <p>Best,<br>MassClip</p>
        </body>
      </html>
    `,
  },
  {
    type: "bundles",
    subject: "Create your first bundle",
    resendAfterDays: 7,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Create your first bundle</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hi there,</p>
          <p>We noticed you have not created a bundle yet. Bundles are how your content is organized and displayed to buyers.</p>
          <p>Once you add your first bundle, your storefront will begin to take shape and people will have something to purchase.</p>
          <p><a href="https://www.massclip.pro/dashboard/bundles" style="color: #007BFF; text-decoration: underline;">You can create your first bundle here</a>.</p>
          <p>Best,<br>MassClip</p>
        </body>
      </html>
    `,
  },
  {
    type: "free-content",
    subject: "Upload free content to build trust",
    resendAfterDays: 7,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Upload free content to build trust</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hi there,</p>
          <p>We noticed you have not uploaded any free content yet. Free content gives potential buyers a preview of your work and helps them feel confident about purchasing.</p>
          <p>Even one free upload can make a difference.</p>
          <p><a href="https://www.massclip.pro/dashboard/free-content" style="color: #007BFF; text-decoration: underline;">You can upload free content here</a>.</p>
          <p>Best,<br>MassClip</p>
        </body>
      </html>
    `,
  },
  {
    type: "content",
    subject: "Upload your first piece of content",
    resendAfterDays: 7,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Upload your first piece of content</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hi there,</p>
          <p>It looks like you have not uploaded any content yet. Uploading is the first step toward creating bundles, sharing free previews, and making your storefront active.</p>
          <p><a href="https://www.massclip.pro/dashboard" style="color: #007BFF; text-decoration: underline;">You can upload your content here</a>.</p>
          <p>Best,<br>MassClip</p>
        </body>
      </html>
    `,
  },
]

export class BehavioralEmailService {
  static async hasStripeConnected(uid: string): Promise<boolean> {
    try {
      const userDoc = await adminDb.collection("users").doc(uid).get()
      const userData = userDoc.data()
      return !!(userData?.stripeAccountId && userData?.stripeOnboardingComplete)
    } catch (error) {
      console.error(`❌ Error checking Stripe status for ${uid}:`, error)
      return false
    }
  }

  static async getBundleCount(uid: string): Promise<number> {
    try {
      const bundlesSnapshot = await adminDb.collection("bundles").where("creatorId", "==", uid).get()
      return bundlesSnapshot.size
    } catch (error) {
      console.error(`❌ Error checking bundle count for ${uid}:`, error)
      return 0
    }
  }

  static async getFreeContentCount(uid: string): Promise<number> {
    try {
      const freeContentSnapshot = await adminDb
        .collection("content")
        .where("creatorId", "==", uid)
        .where("isFree", "==", true)
        .get()
      return freeContentSnapshot.size
    } catch (error) {
      console.error(`❌ Error checking free content count for ${uid}:`, error)
      return 0
    }
  }

  static async getTotalContentCount(uid: string): Promise<number> {
    try {
      const contentSnapshot = await adminDb.collection("content").where("creatorId", "==", uid).get()
      return contentSnapshot.size
    } catch (error) {
      console.error(`❌ Error checking total content count for ${uid}:`, error)
      return 0
    }
  }

  static async initializeBehavioralEmails(uid: string, email: string, displayName?: string): Promise<void> {
    try {
      const behavioralUser: BehavioralEmailUser = {
        uid,
        email,
        displayName,
        unsubscribed: false,
      }

      await adminDb.collection("behavioralEmails").doc(uid).set(behavioralUser, { merge: true })
      console.log(`✅ Initialized behavioral emails for user: ${email}`)
    } catch (error) {
      console.error("❌ Failed to initialize behavioral emails:", error)
      throw error
    }
  }

  static async checkAndSendBehavioralEmails(): Promise<void> {
    try {
      // Get all users who haven't unsubscribed
      const behavioralSnapshot = await adminDb.collection("behavioralEmails").where("unsubscribed", "==", false).get()

      for (const doc of behavioralSnapshot.docs) {
        const user = doc.data() as BehavioralEmailUser
        await this.checkUserAndSendEmails(user)
      }
    } catch (error) {
      console.error("❌ Error in checkAndSendBehavioralEmails:", error)
    }
  }

  static async checkUserAndSendEmails(user: BehavioralEmailUser): Promise<void> {
    try {
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Check Stripe connection
      const hasStripe = await this.hasStripeConnected(user.uid)
      if (!hasStripe && (!user.lastStripeEmailSent || user.lastStripeEmailSent < sevenDaysAgo)) {
        await this.sendBehavioralEmail(user, "stripe")
      }

      // Check bundle count
      const bundleCount = await this.getBundleCount(user.uid)
      if (bundleCount === 0 && (!user.lastBundleEmailSent || user.lastBundleEmailSent < sevenDaysAgo)) {
        await this.sendBehavioralEmail(user, "bundles")
      }

      // Check free content
      const freeContentCount = await this.getFreeContentCount(user.uid)
      if (freeContentCount === 0 && (!user.lastFreeContentEmailSent || user.lastFreeContentEmailSent < sevenDaysAgo)) {
        await this.sendBehavioralEmail(user, "free-content")
      }

      // Check total content
      const totalContentCount = await this.getTotalContentCount(user.uid)
      if (totalContentCount === 0 && (!user.lastContentEmailSent || user.lastContentEmailSent < sevenDaysAgo)) {
        await this.sendBehavioralEmail(user, "content")
      }
    } catch (error) {
      console.error(`❌ Error checking user ${user.email}:`, error)
    }
  }

  static async sendBehavioralEmail(
    user: BehavioralEmailUser,
    emailType: BehavioralEmailTemplate["type"],
  ): Promise<boolean> {
    try {
      const template = BEHAVIORAL_EMAIL_TEMPLATES.find((t) => t.type === emailType)
      if (!template) {
        console.error(`❌ No template found for type ${emailType}`)
        return false
      }

      // Add unsubscribe link to all emails
      const htmlWithUnsubscribe = template.html.replace(
        "</body>",
        `
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you no longer want to receive emails from MassClip, you can 
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent(user.email)}" style="color: #999;">unsubscribe here</a>.
          </p>
        </body>`,
      )

      const result = await resend.emails.send({
        from: "MassClip <contact@massclip.pro>",
        to: user.email,
        subject: template.subject,
        html: htmlWithUnsubscribe,
      })

      if (result.error) {
        console.error(`❌ Failed to send ${emailType} email to ${user.email}:`, result.error)
        return false
      }

      // Update last sent timestamp
      const updateField = `last${emailType.charAt(0).toUpperCase() + emailType.slice(1).replace("-", "")}EmailSent`
      await adminDb
        .collection("behavioralEmails")
        .doc(user.uid)
        .update({
          [updateField]: new Date(),
        })

      console.log(`✅ Sent ${emailType} email to ${user.email}`)
      return true
    } catch (error) {
      console.error(`❌ Error sending ${emailType} email to ${user.email}:`, error)
      return false
    }
  }

  static async unsubscribeUser(email: string): Promise<void> {
    try {
      const snapshot = await adminDb.collection("behavioralEmails").where("email", "==", email).get()

      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        await doc.ref.update({
          unsubscribed: true,
          unsubscribedAt: new Date(),
        })
        console.log(`✅ Unsubscribed user from behavioral emails: ${email}`)
      }
    } catch (error) {
      console.error(`❌ Failed to unsubscribe user from behavioral emails: ${email}`, error)
    }
  }
}
