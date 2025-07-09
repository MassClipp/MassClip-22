import { NextResponse } from "next/server"

export async function GET() {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    const firebaseProjectId = process.env.FIREBASE_PROJECT_ID
    const vercelEnv = process.env.VERCEL_ENV || process.env.NODE_ENV

    // Determine Stripe mode
    const stripeMode = stripeSecretKey?.startsWith("sk_live_") ? "LIVE" : "TEST"
    const stripeKeyPrefix = stripeSecretKey ? stripeSecretKey.substring(0, 12) : "NOT_SET"

    const environmentStatus = {
      stripeMode,
      stripeKeyPrefix,
      webhookConfigured: !!stripeWebhookSecret,
      firebaseConnected: !!firebaseProjectId,
      environment: vercelEnv,
      timestamp: new Date().toISOString(),
    }

    console.log("🔍 [Environment Status]", {
      stripeMode,
      stripeKeyPrefix,
      webhookConfigured: environmentStatus.webhookConfigured,
      firebaseConnected: environmentStatus.firebaseConnected,
      environment: vercelEnv,
    })

    return NextResponse.json(environmentStatus)
  } catch (error) {
    console.error("❌ [Environment Status] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch environment status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
