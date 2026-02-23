import { NextResponse } from "next/server"
import { OnboardingEmailService } from "@/lib/onboarding-email-service"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes for cron job

export async function GET() {
  // All automated emails disabled
  return NextResponse.json({
    success: true,
    message: "Onboarding emails are disabled",
    disabled: true,
  })

  try {
    console.log("🔄 Onboarding/Sales Objective Email Cron Job Started")

    await OnboardingEmailService.checkAndSendEmails()

    return NextResponse.json({
      success: true,
      message: "Onboarding and sales objective emails processed successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Error in onboarding emails cron job:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
