import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { BehavioralEmailService } from "@/lib/behavioral-email-service"

export async function POST() {
  try {
    console.log("🔄 Running behavioral email diagnostics...")

    // Get all behavioral email users
    const behavioralSnapshot = await adminDb.collection("behavioralEmails").get()
    const totalUsers = behavioralSnapshot.size

    // Count unsubscribed users
    const unsubscribedUsers = behavioralSnapshot.docs.filter((doc) => doc.data().unsubscribed === true).length

    const eligibleUsers = totalUsers - unsubscribedUsers

    // Count recent emails (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    let recentEmailsSent = 0

    // Count users needing each type of email
    const usersNeedingEmails = {
      stripe: 0,
      bundles: 0,
      freeContent: 0,
      content: 0,
    }

    const errors: string[] = []

    // Analyze each user
    for (const doc of behavioralSnapshot.docs) {
      const user = doc.data()

      if (user.unsubscribed) continue

      try {
        // Check if user needs Stripe email
        const hasStripe = await BehavioralEmailService.hasStripeConnected(user.uid)
        const lastStripeEmail = user.lastStripeEmailSent?.toDate()
        if (!hasStripe && (!lastStripeEmail || lastStripeEmail < sevenDaysAgo)) {
          usersNeedingEmails.stripe++
        }
        if (lastStripeEmail && lastStripeEmail > sevenDaysAgo) recentEmailsSent++

        // Check if user needs bundle email
        const bundleCount = await BehavioralEmailService.getBundleCount(user.uid)
        const lastBundleEmail = user.lastBundleEmailSent?.toDate()
        if (bundleCount === 0 && (!lastBundleEmail || lastBundleEmail < sevenDaysAgo)) {
          usersNeedingEmails.bundles++
        }
        if (lastBundleEmail && lastBundleEmail > sevenDaysAgo) recentEmailsSent++

        // Check if user needs free content email
        const freeContentCount = await BehavioralEmailService.getFreeContentCount(user.uid)
        const lastFreeContentEmail = user.lastFreeContentEmailSent?.toDate()
        if (freeContentCount === 0 && (!lastFreeContentEmail || lastFreeContentEmail < sevenDaysAgo)) {
          usersNeedingEmails.freeContent++
        }
        if (lastFreeContentEmail && lastFreeContentEmail > sevenDaysAgo) recentEmailsSent++

        // Check if user needs content email
        const totalContentCount = await BehavioralEmailService.getTotalContentCount(user.uid)
        const lastContentEmail = user.lastContentEmailSent?.toDate()
        if (totalContentCount === 0 && (!lastContentEmail || lastContentEmail < sevenDaysAgo)) {
          usersNeedingEmails.content++
        }
        if (lastContentEmail && lastContentEmail > sevenDaysAgo) recentEmailsSent++
      } catch (error) {
        console.error(`Error analyzing user ${user.email}:`, error)
        errors.push(`Failed to analyze user ${user.email}: ${error}`)
      }
    }

    // Check environment variables
    if (!process.env.RESEND_API_KEY) {
      errors.push("RESEND_API_KEY environment variable is missing")
    }

    if (!process.env.RESEND_WEBHOOK_SECRET) {
      errors.push("RESEND_WEBHOOK_SECRET environment variable is missing")
    }

    const result = {
      totalUsers,
      eligibleUsers,
      unsubscribedUsers,
      recentEmailsSent,
      usersNeedingEmails,
      errors,
    }

    console.log("✅ Behavioral email diagnostics completed:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Error running behavioral email diagnostics:", error)
    return NextResponse.json(
      {
        error: "Failed to run diagnostics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
