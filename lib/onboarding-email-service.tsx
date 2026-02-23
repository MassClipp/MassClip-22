import { adminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

interface OnboardingEmailUser {
  uid: string
  email: string
  displayName?: string
  createdAt: Date
  completedSteps: string[]
  totalSteps: number
  lastOnboardingEmailSent?: Date
  lastSalesObjectiveEmailSent?: Date
  unsubscribed: boolean
}

interface EmailTemplate {
  subject: string
  html: string
}

export class OnboardingEmailService {
  // Get onboarding progress for a user
  static async getOnboardingProgress(uid: string): Promise<{ completed: number; total: number; steps: string[] }> {
    try {
      const onboardingDoc = await adminDb.collection("onboarding").doc(uid).get()
      if (!onboardingDoc.exists) {
        return { completed: 0, total: 6, steps: [] }
      }

      const data = onboardingDoc.data()
      const completedSteps = data?.completedSteps || []
      return {
        completed: completedSteps.length,
        total: 6,
        steps: completedSteps,
      }
    } catch (error) {
      console.error(`Error getting onboarding progress for ${uid}:`, error)
      return { completed: 0, total: 6, steps: [] }
    }
  }

  // Get sales objectives progress
  static async getSalesObjectivesProgress(
    uid: string,
  ): Promise<{ completedObjectives: number; totalEarnings: number; totalSales: number }> {
    try {
      const userDoc = await adminDb.collection("users").doc(uid).get()
      const userData = userDoc.data()

      // Get earnings data
      const totalEarnings = userData?.totalEarnings || 0
      const totalSales = userData?.totalSales || 0

      // Calculate completed objectives (from Starter tier)
      let completedObjectives = 0
      if (totalSales >= 1) completedObjectives++
      if (totalEarnings >= 50) completedObjectives++
      if (totalSales >= 5) completedObjectives++

      return { completedObjectives, totalEarnings, totalSales }
    } catch (error) {
      console.error(`Error getting sales objectives for ${uid}:`, error)
      return { completedObjectives: 0, totalEarnings: 0, totalSales: 0 }
    }
  }

  // Generate onboarding reminder email
  static generateOnboardingEmail(
    displayName: string,
    completed: number,
    total: number,
    daysActive: number,
  ): EmailTemplate {
    const remaining = total - completed
    const percentage = Math.round((completed / total) * 100)

    let subject: string
    let mainMessage: string
    let urgency: string

    if (completed === 0) {
      subject = "Your MassClip storefront is waiting for you 🚀"
      mainMessage = `You signed up ${daysActive} ${daysActive === 1 ? "day" : "days"} ago, but you haven't started setting up your storefront yet. The best part? It only takes a few minutes to get everything ready.`
      urgency =
        "Creators who complete their setup in the first week are 3x more likely to make their first sale within 30 days."
    } else if (completed < 3) {
      subject = `You're ${percentage}% there! Only ${remaining} steps left 💪`
      mainMessage = `You've completed ${completed} out of ${total} setup steps. You're so close to having a fully functional storefront that can start earning you money!`
      urgency = `Just ${remaining} more ${remaining === 1 ? "step" : "steps"} and you'll be ready to start selling. Don't let this momentum slip away.`
    } else if (completed < 6) {
      subject = `Almost there! Just ${remaining} more ${remaining === 1 ? "step" : "steps"} to go 🎯`
      mainMessage = `You've done the hard part—${completed} out of ${total} steps complete! Your storefront is ${percentage}% ready to start making you money.`
      urgency = `Finish these last ${remaining} ${remaining === 1 ? "step" : "steps"} today and join the hundreds of creators already earning passive income on MassClip.`
    } else {
      subject = "One final step to launch your storefront! 🚀"
      mainMessage = `You're at ${completed}/${total} steps—just one more to go! Your storefront is ready, your content is uploaded, and you're about to start earning.`
      urgency = "Complete this final step and you'll officially be in business. Your audience is waiting."
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">MassClip</h1>
          </div>
          
          <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 10px;">Hey ${displayName || "there"}! 👋</p>
            
            <p style="margin-bottom: 25px;">${mainMessage}</p>
            
            <!-- Progress Bar -->
            <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 30px 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-weight: 600; color: #374151;">Setup Progress</span>
                <span style="font-weight: 700; color: #667eea; font-size: 20px;">${completed}/${total}</span>
              </div>
              <div style="background: #e5e7eb; height: 12px; border-radius: 6px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); height: 100%; width: ${percentage}%; transition: width 0.3s ease;"></div>
              </div>
              <p style="margin-top: 12px; font-size: 14px; color: #6b7280;">Only ${remaining} ${remaining === 1 ? "step" : "steps"} remaining!</p>
            </div>
            
            <p style="margin-bottom: 25px; font-weight: 500;">${urgency}</p>
            
            <!-- Social Proof / FOMO -->
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; font-size: 15px; color: #92400e;">
                <strong>💰 Real talk:</strong> Creators like you are adding an average of $500-$2,000/month in passive income by selling their clips on MassClip. The ones who finish setup quickly see results faster.
              </p>
            </div>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="https://www.massclip.pro/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                Complete Your Setup →
              </a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              Need help? Just reply to this email—we're here to support you every step of the way.
            </p>
            
            <p style="margin-top: 25px; margin-bottom: 0;">
              Let's get you earning,<br>
              <strong>The MassClip Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              Don't want these emails? 
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email={{EMAIL}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe here</a>
            </p>
          </div>
        </body>
      </html>
    `

    return { subject, html }
  }

  // Generate sales objectives email
  static generateSalesObjectivesEmail(
    displayName: string,
    completedObjectives: number,
    totalEarnings: number,
    totalSales: number,
  ): EmailTemplate {
    let subject: string
    let mainMessage: string
    let nextGoal: string
    let ctaText: string

    if (totalSales === 0) {
      subject = "Your first sale is waiting to happen 💸"
      mainMessage =
        "You've set up your storefront, but you haven't made your first sale yet. This is the exciting part—turning your content into real income!"
      nextGoal = "Make your first sale and unlock the Starter tier. Once you hit this milestone, momentum builds fast."
      ctaText = "View Your Storefront"
    } else if (totalSales < 5) {
      subject = `You're at ${totalSales}/5 sales! Keep the momentum going 🚀`
      mainMessage = `You've made ${totalSales} ${totalSales === 1 ? "sale" : "sales"}—that's huge! You've proven people want your content. Now let's build on that momentum.`
      nextGoal = `Just ${5 - totalSales} more ${5 - totalSales === 1 ? "sale" : "sales"} to complete the Starter tier and unlock Builder status. You're closer than you think.`
      ctaText = "Check Your Progress"
    } else if (totalEarnings < 250) {
      subject = "You're in the Builder tier! Time to scale 📈"
      mainMessage = `You've completed the Starter tier with ${totalSales} sales! You're now in Builder territory, where things start to scale.`
      nextGoal = `Your next milestone: $250 in earnings. You're at $${totalEarnings.toFixed(2)}—keep creating and promoting your content.`
      ctaText = "View Sales Objectives"
    } else {
      subject = "You're crushing it! Here's what's next 🎯"
      mainMessage = `You've earned $${totalEarnings.toFixed(2)} and made ${totalSales} sales. You're officially a successful creator on MassClip!`
      nextGoal = "Keep pushing toward the next tier. The more you create and share, the more you earn."
      ctaText = "See Your Earnings"
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">MassClip</h1>
          </div>
          
          <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 10px;">Hey ${displayName || "there"}! 👋</p>
            
            <p style="margin-bottom: 25px;">${mainMessage}</p>
            
            <!-- Stats Box -->
            <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 25px; margin: 30px 0;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: center;">
                <div>
                  <div style="font-size: 32px; font-weight: 700; color: #059669; margin-bottom: 5px;">$${totalEarnings.toFixed(0)}</div>
                  <div style="font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Total Earnings</div>
                </div>
                <div>
                  <div style="font-size: 32px; font-weight: 700; color: #059669; margin-bottom: 5px;">${totalSales}</div>
                  <div style="font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Total Sales</div>
                </div>
              </div>
            </div>
            
            <p style="margin-bottom: 25px; font-weight: 500;">${nextGoal}</p>
            
            <!-- Social Proof / FOMO -->
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; font-size: 15px; color: #92400e;">
                <strong>📊 Creator Insight:</strong> Creators who consistently add new content see a 40% increase in monthly earnings. More content = more sales = more passive income.
              </p>
            </div>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="https://www.massclip.pro/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                ${ctaText} →
              </a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              Keep up the great work! Your audience loves what you're creating.
            </p>
            
            <p style="margin-top: 25px; margin-bottom: 0;">
              Cheering you on,<br>
              <strong>The MassClip Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              Don't want these emails? 
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email={{EMAIL}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe here</a>
            </p>
          </div>
        </body>
      </html>
    `

    return { subject, html }
  }

  // Check and send onboarding/sales objective emails
  static async checkAndSendEmails(): Promise<void> {
    // All automated emails disabled
    console.log("⏸️ Automated emails disabled - skipping onboarding/sales objective email check")
    return
    try {
      console.log("🔄 Starting onboarding/sales objective email check...")

      // Get all users who are not unsubscribed
      const usersSnapshot = await adminDb.collection("users").get()
      const users = usersSnapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }))

      console.log(`📧 Processing ${users.length} users...`)

      for (const user of users) {
        try {
          // Skip if no email or unsubscribed
          if (!user.email || user.unsubscribed) continue

          const now = new Date()
          const createdAt = user.createdAt?.toDate?.() || user.createdAt || now
          const daysActive = Math.floor((now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))

          // Get onboarding progress
          const onboardingProgress = await this.getOnboardingProgress(user.uid)
          const isOnboardingComplete = onboardingProgress.completed === onboardingProgress.total

          // Get sales objectives progress
          const salesProgress = await this.getSalesObjectivesProgress(user.uid)

          // Determine which email to send
          const lastOnboardingEmail = user.lastOnboardingEmailSent?.toDate?.() || user.lastOnboardingEmailSent
          const lastSalesEmail = user.lastSalesObjectiveEmailSent?.toDate?.() || user.lastSalesObjectiveEmailSent

          const daysSinceLastOnboardingEmail = lastOnboardingEmail
            ? Math.floor((now.getTime() - new Date(lastOnboardingEmail).getTime()) / (1000 * 60 * 60 * 24))
            : 999

          const daysSinceLastSalesEmail = lastSalesEmail
            ? Math.floor((now.getTime() - new Date(lastSalesEmail).getTime()) / (1000 * 60 * 60 * 24))
            : 999

          // Send onboarding email if not complete and it's been 3+ days since last email
          if (!isOnboardingComplete && daysActive >= 2 && daysSinceLastOnboardingEmail >= 3) {
            console.log(`📤 Sending onboarding email to ${user.email}`)
            const emailTemplate = this.generateOnboardingEmail(
              user.displayName || user.username || "there",
              onboardingProgress.completed,
              onboardingProgress.total,
              daysActive,
            )

            const htmlWithEmail = emailTemplate.html.replace(/\{\{EMAIL\}\}/g, user.email)

            await resend.emails.send({
              from: "MassClip <contact@massclip.pro>",
              to: user.email,
              subject: emailTemplate.subject,
              html: htmlWithEmail,
            })

            // Update last sent timestamp
            await adminDb.collection("users").doc(user.uid).update({
              lastOnboardingEmailSent: now,
            })

            console.log(`✅ Sent onboarding email to ${user.email}`)
          }
          // Send sales objectives email if onboarding complete and it's been 5+ days since last email
          else if (isOnboardingComplete && daysSinceLastSalesEmail >= 5) {
            console.log(`📤 Sending sales objectives email to ${user.email}`)
            const emailTemplate = this.generateSalesObjectivesEmail(
              user.displayName || user.username || "there",
              salesProgress.completedObjectives,
              salesProgress.totalEarnings,
              salesProgress.totalSales,
            )

            const htmlWithEmail = emailTemplate.html.replace(/\{\{EMAIL\}\}/g, user.email)

            await resend.emails.send({
              from: "MassClip <contact@massclip.pro>",
              to: user.email,
              subject: emailTemplate.subject,
              html: htmlWithEmail,
            })

            // Update last sent timestamp
            await adminDb.collection("users").doc(user.uid).update({
              lastSalesObjectiveEmailSent: now,
            })

            console.log(`✅ Sent sales objectives email to ${user.email}`)
          }

          // Rate limiting: wait 500ms between users
          await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`❌ Error processing user ${user.uid}:`, error)
        }
      }

      console.log("✅ Completed onboarding/sales objective email check")
    } catch (error) {
      console.error("❌ Error in checkAndSendEmails:", error)
    }
  }
}
