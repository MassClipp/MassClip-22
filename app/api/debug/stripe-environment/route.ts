import { type NextRequest, NextResponse } from "next/server"
import { STRIPE_CONFIG } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [Stripe Environment] Checking environment status`)

    // Test Firebase connection
    let firebaseConnected = false
    try {
      await db.collection("_health").limit(1).get()
      firebaseConnected = true
    } catch (error) {
      console.error("Firebase connection test failed:", error)
    }

    // Check webhook configuration (basic check)
    const webhookConfigured = !!(process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET_LIVE)

    const environmentStatus = {
      stripeMode: STRIPE_CONFIG.isLiveMode ? "LIVE" : STRIPE_CONFIG.isTestMode ? "TEST" : "UNKNOWN",
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || "missing",
      webhookConfigured,
      firebaseConnected,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      hasPublishableKey: STRIPE_CONFIG.hasPublishableKey,
    }

    console.log(`✅ [Stripe Environment] Environment status:`, environmentStatus)

    return NextResponse.json(environmentStatus)
  } catch (error) {
    console.error(`❌ [Stripe Environment] Error:`, error)
    return NextResponse.json(
      {
        stripeMode: "ERROR",
        stripeKeyPrefix: "error",
        webhookConfigured: false,
        firebaseConnected: false,
        environment: "error",
        hasPublishableKey: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
