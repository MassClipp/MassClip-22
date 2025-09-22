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
    subject: "Let's get you paid! 💰",
    resendAfterDays: 7,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Let's get you paid!</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hey there!</p>
          <p>We want you to get paid! 🎉 Your Stripe account isn't connected yet, which means you're missing out on earning money when people buy your amazing content.</p>
          <p>The good news? It only takes 2 minutes to set up, and then you'll be ready to start making money from day one!</p>
          <p><a href="https://www.massclip.pro/dashboard/earnings" style="color: #007BFF; text-decoration: underline;">Connect your Stripe account here and start earning!</a></p>
          <p>Can't wait to see your first sale! 🚀<br>The MassClip Team</p>
        </body>
      </html>
    `,
  },
  {
    type: "bundles",
    subject: "Your first bundle is waiting! 📦",
    resendAfterDays: 7,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Your first bundle is waiting!</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hey there!</p>
          <p>You're so close to having an awesome storefront! 🎯 All you need is your first bundle to get things rolling.</p>
          <p>Think of bundles as your product packages - they're what people will see and want to buy. Once you create one, your storefront comes to life and customers have something exciting to purchase!</p>
          <p><a href="https://www.massclip.pro/dashboard/bundles" style="color: #007BFF; text-decoration: underline;">Create your first bundle here - it's easier than you think!</a></p>
          <p>You've got this! 💪<br>The MassClip Team</p>
        </body>
      </html>
    `,
  },
  {
    type: "free-content",
    subject: "People want to see your work! 👀",
    resendAfterDays: 7,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>People want to see your work!</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hey there!</p>
          <p>People want to see your content! 🔥 Free content is like giving potential buyers a taste of your amazing work - and trust us, they're going to want more.</p>
          <p>Even just one free upload can make all the difference. It shows people what you're capable of and gets them excited to buy your premium stuff!</p>
          <p><a href="https://www.massclip.pro/dashboard/free-content" style="color: #007BFF; text-decoration: underline;">Upload some free content and watch the magic happen!</a></p>
          <p>Your audience is waiting! ✨<br>The MassClip Team</p>
        </body>
      </html>
    `,
  },
  {
    type: "content",
    subject: "Time to share your awesome content! 🎬",
    resendAfterDays: 7,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Time to share your awesome content!</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hey there!</p>
          <p>Your content is waiting to shine! 🌟 Uploading your first piece is the exciting first step toward building bundles, sharing previews, and creating a storefront that people will love.</p>
          <p>We know you've got amazing content to share - let's get it out there for the world to see!</p>
          <p><a href="https://www.massclip.pro/dashboard" style="color: #007BFF; text-decoration: underline;">Upload your content here and get started!</a></p>
          <p>The world needs to see what you've created! 🚀<br>The MassClip Team</p>
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

      const users = behavioralSnapshot.docs.map((doc) => doc.data() as BehavioralEmailUser)
      console.log(`🔄 Processing ${users.length} users for behavioral emails...`)

      for (let i = 0; i < users.length; i++) {
        const user = users[i]
        console.log(`📧 Processing user ${i + 1}/${users.length}: ${user.email}`)

        await this.checkUserAndSendEmails(user)

        // Add delay between users to prevent rate limiting
        // Wait 1 second between each user to be safe (allows up to 4 emails per user if needed)
        if (i < users.length - 1) {
          console.log(`⏳ Waiting 1 second before processing next user...`)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      console.log(`✅ Completed processing all ${users.length} users`)
    } catch (error) {
      console.error("❌ Error in checkAndSendBehavioralEmails:", error)
    }
  }

  static async checkUserAndSendEmails(user: BehavioralEmailUser): Promise<void> {
    try {
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const emailsToSend: BehavioralEmailTemplate["type"][] = []

      // Check Stripe connection
      const hasStripe = await this.hasStripeConnected(user.uid)
      if (!hasStripe && (!user.lastStripeEmailSent || user.lastStripeEmailSent < sevenDaysAgo)) {
        emailsToSend.push("stripe")
      }

      // Check bundle count
      const bundleCount = await this.getBundleCount(user.uid)
      if (bundleCount === 0 && (!user.lastBundleEmailSent || user.lastBundleEmailSent < sevenDaysAgo)) {
        emailsToSend.push("bundles")
      }

      // Check free content
      const freeContentCount = await this.getFreeContentCount(user.uid)
      if (freeContentCount === 0 && (!user.lastFreeContentEmailSent || user.lastFreeContentEmailSent < sevenDaysAgo)) {
        emailsToSend.push("free-content")
      }

      // Check total content
      const totalContentCount = await this.getTotalContentCount(user.uid)
      if (totalContentCount === 0 && (!user.lastContentEmailSent || user.lastContentEmailSent < sevenDaysAgo)) {
        emailsToSend.push("content")
      }

      // Send emails with delays between each one
      for (let i = 0; i < emailsToSend.length; i++) {
        const emailType = emailsToSend[i]
        console.log(`📤 Sending ${emailType} email to ${user.email}`)

        await this.sendBehavioralEmail(user, emailType)

        // Wait 500ms between emails for the same user (2 requests per second = 500ms apart)
        if (i < emailsToSend.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      if (emailsToSend.length > 0) {
        console.log(`✅ Sent ${emailsToSend.length} emails to ${user.email}`)
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
