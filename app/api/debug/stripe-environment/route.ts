import { NextResponse } from "next/server"
import { stripeConfig } from "@/lib/stripe"

export async function GET() {
  try {
    const result = {
      environment: stripeConfig.environment,
      keyType: stripeConfig.keyType,
      isLiveMode: stripeConfig.isLiveMode,
      webhookSecrets: {
        testSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET_TEST,
        liveSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET_LIVE,
        correctSecretAvailable: false,
      },
      recommendations: [],
      issues: [],
    }

    // Check if correct webhook secret is available
    if (stripeConfig.isLiveMode) {
      result.webhookSecrets.correctSecretAvailable = !!process.env.STRIPE_WEBHOOK_SECRET_LIVE
      if (!result.webhookSecrets.correctSecretAvailable) {
        result.issues.push("STRIPE_WEBHOOK_SECRET_LIVE is not set but running in live mode")
        result.recommendations.push("Set STRIPE_WEBHOOK_SECRET_LIVE environment variable")
      }
    } else {
      result.webhookSecrets.correctSecretAvailable = !!process.env.STRIPE_WEBHOOK_SECRET_TEST
      if (!result.webhookSecrets.correctSecretAvailable) {
        result.issues.push("STRIPE_WEBHOOK_SECRET_TEST is not set but running in test mode")
        result.recommendations.push("Set STRIPE_WEBHOOK_SECRET_TEST environment variable")
      }
    }

    // General recommendations
    if (stripeConfig.isLiveMode) {
      result.recommendations.push("⚠️ LIVE MODE: Real payments will be processed")
      result.recommendations.push("Ensure live webhook endpoint is configured in Stripe Dashboard")
      result.recommendations.push("Verify live webhook secret is correctly set")
    } else {
      result.recommendations.push("✅ TEST MODE: Safe for development")
      result.recommendations.push("Ensure test webhook endpoint is configured in Stripe Dashboard")
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Environment check error:", error)
    return NextResponse.json({ error: "Environment check failed" }, { status: 500 })
  }
}
