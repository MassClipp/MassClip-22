import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function GET() {
  try {
    console.log("🔍 [Stripe Config] Checking Stripe configuration...")

    // Get environment info
    const vercelEnv = process.env.VERCEL_ENV || "development"
    const nodeEnv = process.env.NODE_ENV || "development"

    // Check which Stripe key is being used
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST

    let activeKey: string | undefined
    let keySource: string

    if (vercelEnv === "production") {
      activeKey = stripeKey
      keySource = "STRIPE_SECRET_KEY (production)"
    } else {
      activeKey = stripeTestKey || stripeKey
      keySource = stripeTestKey ? "STRIPE_SECRET_KEY_TEST (preview/dev)" : "STRIPE_SECRET_KEY (fallback)"
    }

    if (!activeKey) {
      return NextResponse.json({
        success: false,
        error: "No Stripe key configured",
        config: {
          vercelEnv,
          nodeEnv,
          hasMainKey: !!stripeKey,
          hasTestKey: !!stripeTestKey,
          keySource: "none",
        },
      })
    }

    const keyPrefix = activeKey.substring(0, 7)
    const isLiveKey = keyPrefix === "sk_live"
    const isTestKey = keyPrefix === "sk_test"

    // Test the key by making a simple API call
    let keyValid = false
    let testError: string | null = null

    try {
      await stripe.balance.retrieve()
      keyValid = true
      console.log("✅ [Stripe Config] Key validation successful")
    } catch (error: any) {
      testError = error.message
      console.error("❌ [Stripe Config] Key validation failed:", error.message)
    }

    const config = {
      success: true,
      keyExists: true,
      keyValid,
      keyPrefix,
      mode: isLiveKey ? "live" : isTestKey ? "test" : "unknown",
      environment: vercelEnv,
      nodeEnvironment: nodeEnv,
      keySource,
      expectedSessionType: isLiveKey ? "cs_live_..." : "cs_test_...",
      lastChecked: new Date().toISOString(),
      testError,
      environmentVariables: {
        hasMainKey: !!stripeKey,
        hasTestKey: !!stripeTestKey,
        vercelEnv,
        nodeEnv,
      },
    }

    console.log("📊 [Stripe Config] Configuration:", config)
    return NextResponse.json(config)
  } catch (error: any) {
    console.error("❌ [Stripe Config] Configuration check failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Configuration check failed",
        details: error.message,
        keyExists: false,
        keyValid: false,
      },
      { status: 500 },
    )
  }
}
