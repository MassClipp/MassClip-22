import { NextResponse } from "next/server"
import { STRIPE_CONFIG } from "@/lib/stripe"

export async function GET() {
  try {
    // Check if Firebase is connected
    let firebaseConnected = false
    try {
      const { db } = await import("@/lib/firebase-admin")
      await db.collection("_health").limit(1).get()
      firebaseConnected = true
    } catch (error) {
      console.error("Firebase connection check failed:", error)
    }

    // Determine Stripe mode
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripeMode = stripeSecretKey?.startsWith("sk_live_")
      ? "LIVE"
      : stripeSecretKey?.startsWith("sk_test_")
        ? "TEST"
        : "UNKNOWN"

    // Check webhook configuration
    const webhookConfigured =
      stripeMode === "LIVE" ? !!process.env.STRIPE_WEBHOOK_SECRET_LIVE : !!process.env.STRIPE_WEBHOOK_SECRET_TEST

    const environmentStatus = {
      stripeMode,
      stripeKeyPrefix: stripeSecretKey?.substring(0, 7) || "NOT_SET",
      webhookConfigured,
      firebaseConnected,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      isLiveMode: STRIPE_CONFIG.isLiveMode,
      isTestMode: STRIPE_CONFIG.isTestMode,
      hasPublishableKey: STRIPE_CONFIG.hasPublishableKey,
    }

    console.log("🔍 [Environment Debug] Status:", environmentStatus)

    return NextResponse.json(environmentStatus)
  } catch (error) {
    console.error("❌ [Environment Debug] Error:", error)
    return NextResponse.json({ error: "Failed to check environment status", details: error.message }, { status: 500 })
  }
}
