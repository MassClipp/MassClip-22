import { NextResponse } from "next/server"

export async function GET() {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST
    const vercelEnv = process.env.VERCEL_ENV || process.env.NODE_ENV || "development"

    let keyPrefix = "none"
    let isTestMode = false
    let isLiveMode = false

    if (stripeKey) {
      keyPrefix = stripeKey.substring(0, 8)
      isTestMode = stripeKey.startsWith("sk_test_")
      isLiveMode = stripeKey.startsWith("sk_live_")
    }

    const keyConfiguration = {
      hasMainKey: !!stripeKey,
      hasTestKey: !!stripeTestKey,
      activeKeySource: stripeKey ? (isTestMode ? "STRIPE_SECRET_KEY (test)" : "STRIPE_SECRET_KEY (live)") : "none",
    }

    return NextResponse.json({
      stripeKeyExists: !!stripeKey,
      stripeKeyPrefix: keyPrefix,
      isTestMode,
      isLiveMode,
      environment: vercelEnv,
      timestamp: new Date().toISOString(),
      keyConfiguration,
    })
  } catch (error) {
    console.error("❌ [Stripe Config] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to get Stripe configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
