import { adminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export interface BehavioralEmailUser {
  uid: string
  email: string
  displayName?: string
  createdAt?: Date
  lastStripeEmailSent?: Date
  lastBundleEmailSent?: Date
  lastFreeContentEmailSent?: Date
  lastContentEmailSent?: Date
  lastFirstUploadEmailSent?: Date
  lastGettingStartedEmailSent?: Date
  lastMembershipPurchasedEmailSent?: Date
  lastMembershipCanceledEmailSent?: Date
  lastEbookPurchasedEmailSent?: Date
  unsubscribed: boolean
}

export interface BehavioralEmailTemplate {
  type:
    | "stripe"
    | "bundles"
    | "free-content"
    | "content"
    | "stripe-connected"
    | "bundle-purchased"
    | "bundle-sold"
    | "first-upload"
    | "getting-started"
    | "membership-purchased"
    | "membership-canceled"
    | "ebook-purchased"
  subject: string
  html: string
  resendAfterDays?: number // Optional for one-time emails
  delayHours?: number // For time-based triggers after signup
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
          <p>We want you to get paid! 💰 Your Stripe account isn't connected yet, which means you're missing out on earning money when people buy your amazing content.</p>
          <p>The good news? It only takes 2 minutes to set up, and then you'll be ready to start making money from day one!</p>
          <p><a href="https://www.massclip.pro/dashboard/earnings" style="color: #007BFF; text-decoration: underline;">Connect your Stripe account here and start earning!</a></p>
          <p>Can't wait to see your first sale!<br>The MassClip Team</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you no longer want to receive emails from MassClip, you can 
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent("{{EMAIL}}")}" style="color: #999;">unsubscribe here</a>.
          </p>
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
          <p>You're so close to having an awesome storefront! 📦 All you need is your first bundle to get things rolling.</p>
          <p>Think of bundles as your product packages - they're what people will see and want to buy. Once you create one, your storefront comes to life and customers have something exciting to purchase!</p>
          <p><a href="https://www.massclip.pro/dashboard/bundles" style="color: #007BFF; text-decoration: underline;">Create your first bundle here - it's easier than you think!</a></p>
          <p>You've got this!<br>The MassClip Team</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you no longer want to receive emails from MassClip, you can 
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent("{{EMAIL}}")}" style="color: #999;">unsubscribe here</a>.
          </p>
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
          <p>People want to see your content! 👀 Free content is like giving potential buyers a taste of your amazing work - and trust us, they're going to want more.</p>
          <p>Even just one free upload can make all the difference. It shows people what you're capable of and gets them excited to buy your premium stuff!</p>
          <p><a href="https://www.massclip.pro/dashboard/free-content" style="color: #007BFF; text-decoration: underline;">Upload some free content and watch the magic happen!</a></p>
          <p>Your audience is waiting!<br>The MassClip Team</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you no longer want to receive emails from MassClip, you can 
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent("{{EMAIL}}")}" style="color: #999;">unsubscribe here</a>.
          </p>
        </body>
      </html>
    `,
  },
  {
    type: "content",
    subject: "Time to share your awesome content! 🎬",
    delayHours: 72,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Time to share your awesome content!</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hey there!</p>
          <p>I noticed you haven't uploaded any content yet, and I wanted to check in. Sometimes getting started is the hardest part, so I'm here to help. 🤝</p>
          <p><strong>Here are answers to the most common questions we get:</strong></p>
          <h3 style="margin-top: 25px; margin-bottom: 10px; font-size: 16px;">What type of content should I upload?</h3>
          <p>Anything your audience finds valuable! This could be:</p>
          <ul style="line-height: 1.8;">
            <li>Video tutorials or courses</li>
            <li>Templates and guides</li>
            <li>Exclusive clips or behind-the-scenes content</li>
            <li>Digital products like eBooks or worksheets</li>
            <li>Any other content your audience would pay for</li>
          </ul>
          <h3 style="margin-top: 25px; margin-bottom: 10px; font-size: 16px;">Do I need to organize my content before uploading?</h3>
          <p>Nope! That's what Vex AI is for. Just upload your content, and Vex will organize it, bundle it, and even suggest pricing for you. It all happens in seconds.</p>
          <h3 style="margin-top: 25px; margin-bottom: 10px; font-size: 16px;">How does pricing work?</h3>
          <p>Vex AI analyzes your content and suggests optimal pricing based on what similar creators charge. You can always adjust it, but Vex gives you a smart starting point so you don't have to guess.</p>
          <h3 style="margin-top: 25px; margin-bottom: 10px; font-size: 16px;">What if I need help?</h3>
          <p>We're here for you! Just reply to this email and we'll help you get everything set up. We want to see you succeed.</p>
          <p style="margin-top: 30px;"><strong>The hardest part is starting. Once you upload your first piece of content, everything else falls into place.</strong></p>
          <p><a href="https://www.massclip.pro/dashboard" style="display: inline-block; background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">Upload Your First Content</a></p>
          <p>Your audience is waiting. Let's give them something worth paying for.</p>
          <p>Best,<br>The MassClip Team</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you no longer want to receive emails from MassClip, you can 
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent("{{EMAIL}}")}" style="color: #999;">unsubscribe here</a>.
          </p>
        </body>
      </html>
    `,
  },
  {
    type: "stripe-connected",
    subject: "You're ready to start selling! 🚀",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>You're ready to start selling!</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hey there!</p>
          <p>Congratulations! Your Stripe account is now connected and you're officially ready to start selling! 🚀</p>
          <p>This is huge - you can now accept payments, track your earnings, and watch your business grow. Every bundle you create and every piece of content you upload can now turn into real money in your pocket.</p>
          <p><a href="https://www.massclip.pro/dashboard/earnings" style="color: #007BFF; text-decoration: underline;">Check out your earnings dashboard and start making money!</a></p>
          <p>Here's to your first sale!<br>The MassClip Team</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you no longer want to receive emails from MassClip, you can 
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent("{{EMAIL}}")}" style="color: #999;">unsubscribe here</a>.
          </p>
        </body>
      </html>
    `,
  },
  {
    type: "bundle-purchased",
    subject: "Thanks for your purchase! 🎉",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Thanks for your purchase!</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hey there!</p>
          <p>Thank you so much for your purchase! 🎉 You've just supported an amazing creator and got some incredible content in return.</p>
          <p>Your bundle is ready for download and we know you're going to love what's inside. The creator put their heart into making this content just for people like you!</p>
          <p><a href="https://www.massclip.pro/dashboard/purchases" style="color: #007BFF; text-decoration: underline;">Access your purchased content here</a></p>
          <p>Enjoy your new content!<br>The MassClip Team</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you no longer want to receive emails from MassClip, you can 
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent("{{EMAIL}}")}" style="color: #999;">unsubscribe here</a>.
          </p>
        </body>
      </html>
    `,
  },
  {
    type: "bundle-sold",
    subject: "You made a sale! 💸",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>You made a sale!</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hey there!</p>
          <p>Congratulations! Someone just bought your bundle! 💸 This is what it's all about - your hard work and creativity just turned into real money.</p>
          <p>Your earnings have been updated and the payment is on its way to your connected Stripe account. Keep creating amazing content because people clearly love what you're doing!</p>
          <p><a href="https://www.massclip.pro/dashboard/earnings" style="color: #007BFF; text-decoration: underline;">Check your earnings and celebrate this win!</a></p>
          <p>Here's to many more sales!<br>The MassClip Team</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you no longer want to receive emails from MassClip, you can 
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent("{{EMAIL}}")}" style="color: #999;">unsubscribe here</a>.
          </p>
        </body>
      </html>
    `,
  },
  {
    type: "first-upload",
    subject: "Ready to upload your first content? 🚀",
    delayHours: 2,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Upload Your First Content</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hey there!</p>
          <p>You're just one upload away from getting started with MassClip. 🚀</p>
          <p>The first step is simple: upload the content you want to sell. It could be videos, guides, templates, courses, or anything else your audience values. Once you upload it, Vex AI takes over and does the heavy lifting for you.</p>
          <p><strong>Here's what happens next:</strong></p>
          <ul style="line-height: 1.8;">
            <li>Vex AI analyzes your content</li>
            <li>Organizes it into sellable bundles</li>
            <li>Suggests optimal pricing</li>
            <li>Creates your storefront automatically</li>
          </ul>
          <p>All you have to do is upload. The rest happens in seconds.</p>
          <p><a href="https://www.massclip.pro/dashboard" style="display: inline-block; background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">Upload Your First Content</a></p>
          <p>Your audience is waiting. Let's give them something worth paying for.</p>
          <p>Best,<br>The MassClip Team</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you no longer want to receive emails from MassClip, you can 
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent("{{EMAIL}}")}" style="color: #999;">unsubscribe here</a>.
          </p>
        </body>
      </html>
    `,
  },
  {
    type: "getting-started",
    subject: "Here's exactly how to start earning with MassClip 💸",
    delayHours: 24,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Getting Started with MassClip</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hey there!</p>
          <p>Let's get you set up to start earning passive income from your faceless content. 💸</p>
          <p>I know getting started with a new platform can feel overwhelming, so I'm going to break it down into simple steps. Follow these, and you'll be making money in no time:</p>
          <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 18px;">Step 1: Connect Your Stripe Account</h3>
          <p>This is how you'll receive payouts when people buy your content. It takes about 2 minutes to set up, and once it's done, you're ready to get paid automatically.</p>
          <p><a href="https://www.massclip.pro/dashboard/earnings" style="color: #007BFF; text-decoration: underline;">Connect Stripe here →</a></p>
          <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 18px;">Step 2: Upload Your Content</h3>
          <p>Upload the videos, guides, templates, or any other content you want to sell. Don't worry about organizing it yet—that's what Vex AI is for.</p>
          <p><a href="https://www.massclip.pro/dashboard" style="color: #007BFF; text-decoration: underline;">Upload content here →</a></p>
          <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 18px;">Step 3: Let Vex AI Bundle Your Content</h3>
          <p>Once your content is uploaded, just tell Vex AI how you want it bundled. It could be by topic, by skill level, by format—whatever makes sense for your audience. Vex will organize everything, suggest pricing, and create your bundles in seconds.</p>
          <p><a href="https://www.massclip.pro/dashboard/vex" style="color: #007BFF; text-decoration: underline;">Talk to Vex AI here →</a></p>
          <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 18px;">Step 4: Start Earning Passive Income</h3>
          <p>That's it. Once your bundles are live and your Stripe is connected, you're officially in business. Share your storefront link with your audience, and watch the sales roll in while you sleep.</p>
          <p style="margin-top: 30px;"><strong>Your audience is already waiting to pay for your content.</strong> All you have to do is give them a way to buy it.</p>
          <p><a href="https://www.massclip.pro/dashboard" style="display: inline-block; background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">Complete Your Setup Now</a></p>
          <p>Let's turn your content into income.</p>
          <p>Best,<br>The MassClip Team</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you no longer want to receive emails from MassClip, you can 
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent("{{EMAIL}}")}" style="color: #999;">unsubscribe here</a>.
          </p>
        </body>
      </html>
    `,
  },
  {
    type: "membership-purchased",
    subject: "Welcome to your new plan! Your monetization journey just leveled up",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Welcome to your new plan!</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hey there!</p>
          <p>Your membership is now active, and you just unlocked everything you need to scale your faceless brand monetization. No limits, no hesitation, just pure growth potential.</p>
          <p><strong>Here's what you now have access to:</strong></p>
          <ul style="line-height: 1.8;">
            <li>Unlimited bundles to package and sell your content</li>
            <li>Advanced Vex AI to organize, price, and optimize everything</li>
            <li>Lower platform fees so you keep more of what you earn</li>
            <li>Custom storefront features to stand out from the crowd</li>
          </ul>
          <p>This is where real creators separate themselves from the ones who just talk about it. You invested in yourself, and now it's time to see the returns.</p>
          <p><a href="https://www.massclip.pro/dashboard" style="display: inline-block; background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">Go to Your Dashboard</a></p>
          <p>Let's turn this into something big.</p>
          <p>Best,<br>The MassClip Team</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you no longer want to receive emails from MassClip, you can 
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent("{{EMAIL}}")}" style="color: #999;">unsubscribe here</a>.
          </p>
        </body>
      </html>
    `,
  },
  {
    type: "membership-canceled",
    subject: "We hate to see you go, but we understand",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Membership Canceled</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hey there,</p>
          <p>We noticed you canceled your membership. We're sad to see you go, but we totally get it. Sometimes things change, and that's okay.</p>
          <p>You'll continue to have access to your membership features until the end of your billing period, so you can keep using everything you paid for. After that, you'll still have a free account where you can access your content and storefronts, you just won't be able to accept payments or create new bundles.</p>
          <p><strong>Before you go, we'd love to know:</strong></p>
          <p>What made you cancel? Was it the price, missing features, or something else? Your feedback helps us build a better product, and we genuinely want to know what would've made you stay.</p>
          <p>Just reply to this email and let us know. We read every response.</p>
          <p>If you change your mind, you can reactivate anytime from your dashboard. No judgment, no hassle.</p>
          <p><a href="https://www.massclip.pro/dashboard/upgrade" style="display: inline-block; background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">Reactivate Your Membership</a></p>
          <p>Thanks for giving MassClip a shot. We hope to see you back soon.</p>
          <p>Best,<br>The MassClip Team</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you no longer want to receive emails from MassClip, you can 
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent("{{EMAIL}}")}" style="color: #999;">unsubscribe here</a>.
          </p>
        </body>
      </html>
    `,
  },
  {
    type: "ebook-purchased",
    subject: "Your eBook is ready to read!",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Your eBook is ready!</title>
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
          <p>Hey there!</p>
          <p>Thanks for your purchase! Your eBook is ready to read, and we think you're going to love it.</p>
          <p>The creator put serious work into crafting this for people like you, someone who values knowledge and is willing to invest in learning. You're not just reading an eBook, you're investing in yourself.</p>
          <p><a href="https://www.massclip.pro/dashboard/purchases" style="display: inline-block; background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">Read Your eBook Now</a></p>
          <p>Enjoy the read, and let us know what you think!</p>
          <p>Best,<br>The MassClip Team</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you no longer want to receive emails from MassClip, you can 
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent("{{EMAIL}}")}" style="color: #999;">unsubscribe here</a>.
          </p>
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
        createdAt: new Date(),
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
    // All automated emails disabled
    console.log("⏸️ Automated emails disabled - skipping behavioral email check")
    return
    try {
      const behavioralSnapshot = await adminDb.collection("behavioralEmails").where("unsubscribed", "==", false).get()

      const users = behavioralSnapshot.docs.map((doc) => doc.data() as BehavioralEmailUser)
      console.log(`🔄 Processing ${users.length} users for behavioral emails...`)

      for (let i = 0; i < users.length; i++) {
        const user = users[i]
        console.log(`📧 Processing user ${i + 1}/${users.length}: ${user.email}`)

        await this.checkUserAndSendEmails(user)

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

      if (user.createdAt) {
        const userCreatedAt = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt)
        const hoursSinceSignup = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60)

        const totalContentCount = await this.getTotalContentCount(user.uid)
        if (totalContentCount === 0 && hoursSinceSignup >= 2 && !user.lastFirstUploadEmailSent) {
          emailsToSend.push("first-upload")
        }

        if (totalContentCount === 0 && hoursSinceSignup >= 24 && !user.lastGettingStartedEmailSent) {
          emailsToSend.push("getting-started")
        }

        if (
          totalContentCount === 0 &&
          hoursSinceSignup >= 72 &&
          (!user.lastContentEmailSent || user.lastContentEmailSent < sevenDaysAgo)
        ) {
          emailsToSend.push("content")
        }
      }

      const hasStripe = await this.hasStripeConnected(user.uid)
      if (!hasStripe && (!user.lastStripeEmailSent || user.lastStripeEmailSent < sevenDaysAgo)) {
        emailsToSend.push("stripe")
      }

      const bundleCount = await this.getBundleCount(user.uid)
      if (bundleCount === 0 && (!user.lastBundleEmailSent || user.lastBundleEmailSent < sevenDaysAgo)) {
        emailsToSend.push("bundles")
      }

      const freeContentCount = await this.getFreeContentCount(user.uid)
      if (freeContentCount === 0 && (!user.lastFreeContentEmailSent || user.lastFreeContentEmailSent < sevenDaysAgo)) {
        emailsToSend.push("free-content")
      }

      for (let i = 0; i < emailsToSend.length; i++) {
        const emailType = emailsToSend[i]
        console.log(`📤 Sending ${emailType} email to ${user.email}`)

        await this.sendBehavioralEmail(user, emailType)

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

      const htmlWithEmail = template.html.replace(/\{\{EMAIL\}\}/g, user.email)

      const htmlWithUnsubscribe = htmlWithEmail.replace(
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

      let updateField: string
      switch (emailType) {
        case "first-upload":
          updateField = "lastFirstUploadEmailSent"
          break
        case "getting-started":
          updateField = "lastGettingStartedEmailSent"
          break
        case "stripe":
          updateField = "lastStripeEmailSent"
          break
        case "bundles":
          updateField = "lastBundleEmailSent"
          break
        case "free-content":
          updateField = "lastFreeContentEmailSent"
          break
        case "content":
          updateField = "lastContentEmailSent"
          break
        case "membership-purchased":
          updateField = "lastMembershipPurchasedEmailSent"
          break
        case "membership-canceled":
          updateField = "lastMembershipCanceledEmailSent"
          break
        case "ebook-purchased":
          updateField = "lastEbookPurchasedEmailSent"
          break
        default:
          updateField = `last${emailType.charAt(0).toUpperCase() + emailType.slice(1).replace("-", "")}EmailSent`
      }

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

  // All automated emails disabled - methods kept as no-ops to avoid breaking callers
  static async sendStripeConnectedEmail(uid: string, email: string, displayName?: string): Promise<void> {
    console.log(`⏸️ Automated emails disabled - skipping Stripe connected email to ${email}`)
  }

  static async sendBundlePurchasedEmail(buyerEmail: string, bundleTitle: string): Promise<void> {
    console.log(`⏸️ Automated emails disabled - skipping bundle purchased email to ${buyerEmail}`)
  }

  static async sendBundleSoldEmail(sellerUid: string, sellerEmail: string, bundleTitle: string): Promise<void> {
    console.log(`⏸️ Automated emails disabled - skipping bundle sold email to ${sellerEmail}`)
  }

  static async sendMembershipPurchasedEmail(uid: string, email: string, planName: string): Promise<void> {
    console.log(`⏸️ Automated emails disabled - skipping membership purchased email to ${email}`)
  }

  static async sendMembershipCanceledEmail(uid: string, email: string, planName: string): Promise<void> {
    console.log(`⏸️ Automated emails disabled - skipping membership canceled email to ${email}`)
  }

  static async sendEbookPurchasedEmail(buyerEmail: string, ebookTitle: string): Promise<void> {
    console.log(`⏸️ Automated emails disabled - skipping eBook purchased email to ${buyerEmail}`)
  }
}
