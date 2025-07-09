import { NextResponse } from "next/server"
import { STRIPE_CONFIG } from "@/lib/stripe"

export async function GET() {
  try {
    console.log(`🔍 [Stripe Environment Debug] Checking environment status`)

    // Get environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    const result = {
      stripeMode: STRIPE_CONFIG.isLiveMode ? "LIVE" : "TEST",
      stripeKeyPrefix: stripeSecretKey?.substring(0, 7) || "NOT_SET",
      webhookConfigured: !!webhookSecret,
      firebaseConnected: true, // Assume true if we can run this endpoint
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      hasPublishableKey: !!stripePublishableKey,
      publishableKeyPrefix: stripePublishableKey?.substring(0, 7) || "NOT_SET",
    }

    console.log(`✅ [Stripe Environment Debug] Environment check completed:`, result)

    return NextResponse.json(result)
  } catch (error) {
    console.error(`❌ [Stripe Environment Debug] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to check environment status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
