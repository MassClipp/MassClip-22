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
    subject: "Welcome to the platform built for serious creators",
    delayDays: 0, // Sent immediately (already handled in create-user)
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Welcome to MassClip!</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hi there,</p>
          <p>Welcome to MassClip! We believe selling content should be taken more seriously and treated as a true business. Too often, creators are left with platforms that undervalue their work or make it hard to earn consistently.</p>
          <p>That's why we built MassClip — to give creators a professional, streamlined way to monetize their content. Our goal is to help you build a sustainable income while showcasing your work the way it deserves.</p>
          <p>Over the next few days, we'll walk you through everything you need to get started and set yourself up for success.</p>
          <p>We're glad you're here. Let's make this the beginning of something big.</p>
          <p><a href="https://www.massclip.pro/dashboard" style="color: #007BFF; text-decoration: underline;">Take a moment to explore the platform here.</a></p>
          <p>Cheers,<br>MassClip</p>
        </body>
      </html>
    `,
  },
  {
    day: 2,
    subject: "Get set up to start earning",
    delayDays: 1,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Connect Your Stripe Account</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hi there,</p>
          <p>You're almost ready to start earning. The next step is connecting your Stripe account so you can get paid directly for your sales.</p>
          <p>It's quick and easy to set up. <a href="https://www.massclip.pro/dashboard/earnings" style="color: #007BFF; text-decoration: underline;">Just click here to connect your Stripe account</a> and you'll be good to go.</p>
          <p>Once that's done, you'll be all set to start receiving payouts.</p>
          <p>Cheers,<br>MassClip</p>
        </body>
      </html>
    `,
  },
  {
    day: 3,
    subject: "Time to create your first bundle",
    delayDays: 2,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Create Your First Bundle</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hi there,</p>
          <p>Now that you're set up to get paid, it's time to create your first bundle. Bundles let you group content together so buyers know exactly what they're getting.</p>
          <p>Pro tip: Make each bundle focused on a specific topic or category. This helps your audience find what they're looking for and increases the chances they'll buy.</p>
          <p><a href="https://www.massclip.pro/dashboard/bundles" style="color: #007BFF; text-decoration: underline;">Go ahead and create your first bundle here.</a> You'll be surprised how quickly it comes together.</p>
          <p>Best,<br>MassClip</p>
        </body>
      </html>
    `,
  },
  {
    day: 4,
    subject: "Build trust with free content",
    delayDays: 3,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Upload Free Content</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hi there,</p>
          <p>Here's a little secret: free content is more powerful than most people realize. When you upload free content, it gives potential buyers a taste of your work and builds trust in the quality of your bundles.</p>
          <p>Think of it as your highlight reel. The better the preview, the more likely people are to purchase.</p>
          <p><a href="https://www.massclip.pro/dashboard/free-content" style="color: #007BFF; text-decoration: underline;">Upload your first free content here</a> and let your audience see what you can do.</p>
          <p>Cheers,<br>MassClip</p>
        </body>
      </html>
    `,
  },
  {
    day: 5,
    subject: "Make your storefront live today",
    delayDays: 4,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Go Live With Your Storefront</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hi there,</p>
          <p>Your storefront is ready to shine. Once you've got bundles and content uploaded, the next step is adding your store link to your social bio. That way, traffic can start flowing in and sales can start rolling.</p>
          <p>It's simple, but it makes all the difference. The easier it is for people to find your storefront, the faster you'll see results.</p>
          <p><a href="https://www.massclip.pro/dashboard" style="color: #007BFF; text-decoration: underline;">Visit your dashboard here to view your profile and copy your storefront link.</a></p>
          <p>All the best,<br>MassClip</p>
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
