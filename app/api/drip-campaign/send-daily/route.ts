import { type NextRequest, NextResponse } from "next/server"
import { DripCampaignService } from "@/lib/drip-campaign-service"

export async function POST(request: NextRequest) {
  try {
    const { day } = await request.json()

    if (!day || day < 2 || day > 5) {
      return NextResponse.json({ error: "Invalid day. Must be 2-5." }, { status: 400 })
    }

    console.log(`🔄 Starting drip campaign for day ${day}...`)

    // Get users ready for this day's email
    const users = await DripCampaignService.getUsersReadyForEmail(day)
    console.log(`📊 Found ${users.length} users ready for day ${day} email`)

    let successCount = 0
    let errorCount = 0

    // Send emails to all ready users
    for (const user of users) {
      const success = await DripCampaignService.sendDayEmail(user, day)
      if (success) {
        successCount++
      } else {
        errorCount++
      }

      // Rate limiting - wait 100ms between emails
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(`✅ Drip campaign day ${day} completed: ${successCount} sent, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      day,
      totalUsers: users.length,
      successCount,
      errorCount,
    })
  } catch (error: any) {
    console.error(`❌ Error in drip campaign day sender:`, error)
    return NextResponse.json({ error: "Failed to send drip campaign emails", details: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Drip Campaign Daily Sender",
    usage: "POST with { day: 2-5 } to send that day's emails",
    schedule: "Should be called daily at 8AM Eastern for each day (2-5)",
  })
}
