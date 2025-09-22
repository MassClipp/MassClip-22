import { type NextRequest, NextResponse } from "next/server"
import { BehavioralEmailService } from "@/lib/behavioral-email-service"

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Starting behavioral email check...")

    if (process.env.PAUSE_BEHAVIORAL_EMAILS === "true") {
      console.log("⏸️ Behavioral emails are paused via PAUSE_BEHAVIORAL_EMAILS environment variable")
      return NextResponse.json({
        success: true,
        message: "Behavioral emails are currently paused",
        paused: true,
      })
    }

    await BehavioralEmailService.checkAndSendBehavioralEmails()

    console.log("✅ Behavioral email check completed")

    return NextResponse.json({
      success: true,
      message: "Behavioral email check completed successfully",
    })
  } catch (error) {
    console.error("❌ Error in behavioral email check:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to check and send behavioral emails",
      },
      { status: 500 },
    )
  }
}
