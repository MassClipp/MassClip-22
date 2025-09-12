import { adminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export interface DripCampaignUser {
  uid: string
  email: string
  displayName?: string
  signupDate: Date
  currentDay: number
  completed: boolean
  lastEmailSent?: Date
  unsubscribed: boolean
}

export interface EmailTemplate {
  day: number
  subject: string
  html: string
  delayDays: number
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    day: 1,
    subject: "Welcome to MassClip",
    delayDays: 0, // Sent immediately (already handled in create-user)
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Welcome to MassClip</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hi there,</p>
          <p>Welcome to MassClip. Monetize your faceless content effortlessly. Sell b-rolls, background videos, clips, images, and audio through a clean, minimal storefront profile. MassClip handles all file hosting so you can focus on creating.</p>
          <p>Just upload your content, publish it in full HD, and start earning — no file management required.</p>
          <p>Over the next few days, we'll guide you step by step so you can get everything set up.</p>
          <p><a href="https://www.massclip.pro/dashboard" style="color: #007BFF; text-decoration: underline;">You can take a look around the platform here.</a></p>
          <p>Best,<br>MassClip</p>
        </body>
      </html>
    `,
  },
  {
    day: 2,
    subject: "Set up payments with Stripe",
    delayDays: 1,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Set up payments with Stripe</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hi there,</p>
          <p>The next step to getting started is connecting your Stripe account. This allows MassClip to send payouts directly to you.</p>
          <p><a href="https://www.massclip.pro/dashboard/earnings" style="color: #007BFF; text-decoration: underline;">You can connect your Stripe account here.</a> It only takes a few minutes.</p>
          <p>Once connected, you'll be ready to receive payments whenever someone buys your content.</p>
          <p>Best,<br>MassClip</p>
        </body>
      </html>
    `,
  },
  {
    day: 3,
    subject: "Create your first bundle",
    delayDays: 2,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Create your first bundle</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hi there,</p>
          <p>With payments ready, the next step is creating your first bundle. Bundles let you organize your content so people can see exactly what they'll get.</p>
          <p>Keeping each bundle focused on a topic makes it easier for your audience to decide what they want.</p>
          <p><a href="https://www.massclip.pro/dashboard/bundles" style="color: #007BFF; text-decoration: underline;">You can create your first bundle here.</a></p>
          <p>Best,<br>MassClip</p>
        </body>
      </html>
    `,
  },
  {
    day: 4,
    subject: "Add some free content",
    delayDays: 3,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Add some free content</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hi there,</p>
          <p>Adding free content is a simple way to show your audience the quality of your work. It helps people get familiar with what you offer before they purchase a bundle.</p>
          <p>Think of it as a preview. Even one free upload can make a difference.</p>
          <p><a href="https://www.massclip.pro/dashboard/free-content" style="color: #007BFF; text-decoration: underline;">You can upload free content here.</a></p>
          <p>Best,<br>MassClip</p>
        </body>
      </html>
    `,
  },
  {
    day: 5,
    subject: "Share your storefront link",
    delayDays: 4,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Share your storefront link</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hi there,</p>
          <p>Your storefront is ready. Once you've uploaded your bundles and content, the next step is sharing your link so others can find it.</p>
          <p>A good place to start is adding your storefront link to your social bio.</p>
          <p><a href="https://www.massclip.pro/dashboard" style="color: #007BFF; text-decoration: underline;">You can view your profile here and copy your storefront link.</a></p>
          <p>Best,<br>MassClip</p>
        </body>
      </html>
    `,
  },
]

export class DripCampaignService {
  static async initializeCampaign(uid: string, email: string, displayName?: string): Promise<void> {
    try {
      const campaignUser: DripCampaignUser = {
        uid,
        email,
        displayName,
        signupDate: new Date(),
        currentDay: 1, // Start at day 1 (welcome email already sent)
        completed: false,
        unsubscribed: false,
      }

      await adminDb.collection("dripCampaigns").doc(uid).set(campaignUser)
      console.log(`✅ Initialized drip campaign for user: ${email}`)
    } catch (error) {
      console.error("❌ Failed to initialize drip campaign:", error)
      throw error
    }
  }

  static async getUsersReadyForEmail(day: number): Promise<DripCampaignUser[]> {
    try {
      const template = EMAIL_TEMPLATES.find((t) => t.day === day)
      if (!template) return []

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - template.delayDays)

      const snapshot = await adminDb
        .collection("dripCampaigns")
        .where("currentDay", "==", day)
        .where("completed", "==", false)
        .where("unsubscribed", "==", false)
        .where("signupDate", "<=", cutoffDate)
        .get()

      return snapshot.docs.map((doc) => doc.data() as DripCampaignUser)
    } catch (error) {
      console.error(`❌ Failed to get users ready for day ${day}:`, error)
      return []
    }
  }

  static async sendDayEmail(user: DripCampaignUser, day: number): Promise<boolean> {
    try {
      const template = EMAIL_TEMPLATES.find((t) => t.day === day)
      if (!template) {
        console.error(`❌ No template found for day ${day}`)
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
        console.error(`❌ Failed to send day ${day} email to ${user.email}:`, result.error)
        return false
      }

      // Update user progress
      const nextDay = day + 1
      const isCompleted = nextDay > EMAIL_TEMPLATES.length

      await adminDb
        .collection("dripCampaigns")
        .doc(user.uid)
        .update({
          currentDay: isCompleted ? day : nextDay,
          completed: isCompleted,
          lastEmailSent: new Date(),
          [`day${day}EmailSent`]: new Date(),
        })

      console.log(`✅ Sent day ${day} email to ${user.email}`)
      return true
    } catch (error) {
      console.error(`❌ Error sending day ${day} email to ${user.email}:`, error)
      return false
    }
  }

  static async unsubscribeUser(email: string): Promise<void> {
    try {
      const snapshot = await adminDb.collection("dripCampaigns").where("email", "==", email).get()

      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        await doc.ref.update({
          unsubscribed: true,
          unsubscribedAt: new Date(),
        })
        console.log(`✅ Unsubscribed user from drip campaign: ${email}`)
      }
    } catch (error) {
      console.error(`❌ Failed to unsubscribe user from drip campaign: ${email}`, error)
    }
  }
}
