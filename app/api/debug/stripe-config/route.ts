import { NextResponse } from "next/server"

function getStripeKey(): { key: string; source: string } {
  const vercelEnv = process.env.VERCEL_ENV || "development"
  const isProduction = vercelEnv === "production"

  let stripeKey: string | undefined
  let source: string

  if (isProduction) {
    stripeKey = process.env.STRIPE_SECRET_KEY
    source = "STRIPE_SECRET_KEY (production)"
  } else {
    if (process.env.STRIPE_SECRET_KEY_TEST) {
      stripeKey = process.env.STRIPE_SECRET_KEY_TEST
      source = "STRIPE_SECRET_KEY_TEST (preview/development)"
    } else {
      stripeKey = process.env.STRIPE_SECRET_KEY
      source = "STRIPE_SECRET_KEY (fallback)"
    }
  }

  if (!stripeKey) {
    throw new Error("No Stripe key found")
  }

  return { key: stripeKey, source }
}

export async function GET() {
  try {
    const vercelEnv = process.env.VERCEL_ENV || "development"
    const nodeEnv = process.env.NODE_ENV || "development"

    let stripeKeyExists = false
    let stripeKeyPrefix = "Not set"
    let isTestMode = false
    let isLiveMode = false
    let keySource = "None"

    try {
      const { key, source } = getStripeKey()
      stripeKeyExists = true
      stripeKeyPrefix = key.substring(0, 8)
      isTestMode = key.startsWith("sk_test_")
      isLiveMode = key.startsWith("sk_live_")
      keySource = source
    } catch (error) {
      // Key not found, keep defaults
    }

    // Check available keys
    const hasMainKey = !!process.env.STRIPE_SECRET_KEY
    const hasTestKey = !!process.env.STRIPE_SECRET_KEY_TEST
    const mainKeyPrefix = process.env.STRIPE_SECRET_KEY?.substring(0, 8) || "Not set"
    const testKeyPrefix = process.env.STRIPE_SECRET_KEY_TEST?.substring(0, 8) || "Not set"

    return NextResponse.json({
      stripeKeyExists,
      stripeKeyPrefix,
      isTestMode,
      isLiveMode,
      environment: vercelEnv,
      nodeEnv,
      keySource,
      availableKeys: {
        hasMainKey,
        hasTestKey,
        mainKeyPrefix,
        testKeyPrefix,
      },
      recommendations: {
        currentSetup: stripeKeyExists ? "✅ Key configured" : "❌ No key found",
        environmentMatch:
          vercelEnv === "production" && isLiveMode
            ? "✅ Production using live keys"
            : vercelEnv !== "production" && isTestMode
              ? "✅ Preview/Dev using test keys"
              : "⚠️ Environment/key mismatch detected",
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Stripe config debug error:", error)

    return NextResponse.json(
      {
        error: "Failed to check Stripe configuration",
        details: error.message,
        stripeKeyExists: false,
        stripeKeyPrefix: "Error",
        isTestMode: false,
        isLiveMode: false,
        environment: process.env.VERCEL_ENV || "development",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
