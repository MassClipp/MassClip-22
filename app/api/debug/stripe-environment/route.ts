import { NextResponse } from "next/server"

export async function GET() {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY
    const isLiveKey = secretKey?.startsWith("sk_live_")
    const isTestKey = secretKey?.startsWith("sk_test_")
    const nodeEnv = process.env.NODE_ENV

    // Webhook secret detection
    const hasLiveWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET_LIVE
    const hasTestWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET_TEST
    const hasGeneralWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET

    const environment = {
      nodeEnv,
      stripeMode: isLiveKey ? "LIVE" : isTestKey ? "TEST" : "UNKNOWN",
      secretKeyPrefix: secretKey?.substring(0, 8) + "...",
      webhookSecrets: {
        live: hasLiveWebhookSecret,
        test: hasTestWebhookSecret,
        general: hasGeneralWebhookSecret,
      },
      expectedMode: nodeEnv === "production" && isLiveKey ? "LIVE" : "TEST",
      configurationStatus: nodeEnv === "production" && isLiveKey ? "✅ Correct" : "⚠️ Check configuration",
    }

    return NextResponse.json({
      success: true,
      environment,
    })
  } catch (error) {
    console.error("Environment check error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check environment",
      },
      { status: 500 },
    )
  }
}
