import { NextResponse } from "next/server"
import { STRIPE_CONFIG } from "@/lib/stripe"

export async function GET() {
  try {
    // Check webhook secret configuration
    const webhookConfigured = STRIPE_CONFIG.isLiveMode
      ? !!process.env.STRIPE_WEBHOOK_SECRET_LIVE
      : !!process.env.STRIPE_WEBHOOK_SECRET_TEST

    // Check Firebase connection
    let firebaseConnected = false
    try {
      // Simple check - if we can access environment variables
      firebaseConnected = !!(
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      )
    } catch (error) {
      firebaseConnected = false
    }

    const result = {
      stripeMode: STRIPE_CONFIG.isLiveMode ? "LIVE" : "TEST",
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || "unknown",
      webhookConfigured,
      firebaseConnected,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      webhookUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro"}/api/webhooks/stripe`,
      currentDomain: process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro",
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error checking environment status:", error)
    return NextResponse.json(
      {
        error: "Failed to check environment status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
