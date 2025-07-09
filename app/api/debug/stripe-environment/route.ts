import { NextResponse } from "next/server"
import { STRIPE_CONFIG } from "@/lib/stripe"

export async function GET() {
  try {
    console.log(`🔍 [Stripe Environment Debug] Checking environment status`)

    // Check environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    // Determine mode from the actual key
    const stripeMode = stripeSecretKey?.startsWith("sk_live_")
      ? "LIVE"
      : stripeSecretKey?.startsWith("sk_test_")
        ? "TEST"
        : "UNKNOWN"

    const result = {
      stripeMode,
      stripeKeyPrefix: stripeSecretKey?.substring(0, 7) || "missing",
      webhookConfigured: !!webhookSecret,
      firebaseConnected: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY),
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      hasPublishableKey: !!stripePublishableKey,
      config: STRIPE_CONFIG,
    }

    console.log(`✅ [Stripe Environment Debug] Environment status:`, result)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error(`❌ [Stripe Environment Debug] Error:`, error)
    return NextResponse.json(
      {
        error: `Failed to check environment: ${error instanceof Error ? error.message : "Unknown error"}`,
        stripeMode: "ERROR",
        stripeKeyPrefix: "error",
        webhookConfigured: false,
        firebaseConnected: false,
        environment: "error",
      },
      { status: 500 },
    )
  }
}
