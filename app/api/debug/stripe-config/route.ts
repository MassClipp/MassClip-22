import { NextResponse } from "next/server"

export async function GET() {
  try {
    const vercelEnv = process.env.VERCEL_ENV || "development"
    const nodeEnv = process.env.NODE_ENV || "development"

    // Check for Stripe keys
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST

    // Determine which key is being used
    const isProduction = vercelEnv === "production"
    const activeKey = isProduction ? stripeKey : stripeTestKey || stripeKey

    const stripeKeyExists = !!activeKey
    const stripeKeyPrefix = activeKey ? activeKey.substring(0, 8) : "none"
    const isTestMode = stripeKeyPrefix.startsWith("sk_test_")
    const isLiveMode = stripeKeyPrefix.startsWith("sk_live_")

    console.log(`🔍 [Stripe Config] Environment: ${vercelEnv}`)
    console.log(`🔍 [Stripe Config] Key type: ${isLiveMode ? "live" : isTestMode ? "test" : "unknown"}`)
    console.log(`🔍 [Stripe Config] Has main key: ${!!stripeKey}`)
    console.log(`🔍 [Stripe Config] Has test key: ${!!stripeTestKey}`)

    const config = {
      stripeKeyExists,
      stripeKeyPrefix,
      isTestMode,
      isLiveMode,
      environment: vercelEnv,
      nodeEnvironment: nodeEnv,
      timestamp: new Date().toISOString(),
      keyConfiguration: {
        hasMainKey: !!stripeKey,
        hasTestKey: !!stripeTestKey,
        activeKeySource: isProduction
          ? "STRIPE_SECRET_KEY"
          : stripeTestKey
            ? "STRIPE_SECRET_KEY_TEST"
            : "STRIPE_SECRET_KEY (fallback)",
        recommendedSetup: isProduction
          ? "Use STRIPE_SECRET_KEY with live keys"
          : "Use STRIPE_SECRET_KEY_TEST with test keys",
      },
    }

    return NextResponse.json(config)
  } catch (error: any) {
    console.error(`❌ [Stripe Config] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to check Stripe configuration",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
