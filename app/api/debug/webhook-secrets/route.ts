import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get all relevant environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripeTestSecret = process.env.STRIPE_SECRET_KEY_TEST
    const webhookSecretTest = process.env.STRIPE_WEBHOOK_SECRET_TEST
    const webhookSecretLive = process.env.STRIPE_WEBHOOK_SECRET_LIVE
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    // Determine which key is being used
    const usingLiveKey = stripeSecretKey?.startsWith("sk_live_")
    const usingTestKey = stripeSecretKey?.startsWith("sk_test_")

    // Determine environment
    const isProduction = process.env.VERCEL_ENV === "production"
    const isPreview = process.env.VERCEL_ENV === "preview"
    const isDevelopment = process.env.NODE_ENV === "development"

    const environment = {
      isTestMode: usingTestKey,
      isLiveMode: usingLiveKey,
      currentMode: usingLiveKey ? "LIVE MODE" : usingTestKey ? "TEST MODE" : "UNKNOWN",
      detected: usingLiveKey
        ? "🔴 LIVE MODE - Real payments will be processed!"
        : usingTestKey
          ? "🟢 TEST MODE - Safe for development and testing"
          : "⚠️ UNKNOWN MODE - Check Stripe key configuration",
    }

    const webhookSecrets = {
      testSecretSet: !!webhookSecretTest,
      liveSecretSet: !!webhookSecretLive,
      generalSecretSet: !!webhookSecret,
      correctSecretAvailable: usingLiveKey ? !!webhookSecretLive : usingTestKey ? !!webhookSecretTest : !!webhookSecret,
      testSecretLength: webhookSecretTest?.length || 0,
      liveSecretLength: webhookSecretLive?.length || 0,
      generalSecretLength: webhookSecret?.length || 0,
    }

    const stripeKeys = {
      secretKeySet: !!stripeSecretKey,
      keyType: usingLiveKey ? "LIVE KEY (sk_live_...)" : usingTestKey ? "TEST KEY (sk_test_...)" : "UNKNOWN KEY TYPE",
      keyLength: stripeSecretKey?.length || 0,
      keyPrefix: stripeSecretKey?.substring(0, 12) + "..." || "Not set",
    }

    const configurationIssues: string[] = []
    const recommendations: string[] = []

    // Check for configuration issues
    if (!stripeSecretKey) {
      configurationIssues.push("Missing STRIPE_SECRET_KEY environment variable")
    }

    if (usingLiveKey && !webhookSecretLive && !webhookSecret) {
      configurationIssues.push("Using live Stripe key but no live webhook secret found (STRIPE_WEBHOOK_SECRET_LIVE)")
    }

    if (usingTestKey && !webhookSecretTest && !webhookSecret) {
      configurationIssues.push("Using test Stripe key but no test webhook secret found (STRIPE_WEBHOOK_SECRET_TEST)")
    }

    if (isProduction && usingTestKey) {
      configurationIssues.push("Using test keys in production environment")
    }

    // Generate recommendations
    if (usingLiveKey) {
      recommendations.push("✅ Using live Stripe keys - real payments will be processed")
      if (webhookSecretLive) {
        recommendations.push("✅ Live webhook secret is configured")
      } else if (webhookSecret) {
        recommendations.push(
          "⚠️ Using general webhook secret with live keys - consider using STRIPE_WEBHOOK_SECRET_LIVE",
        )
      }
    } else if (usingTestKey) {
      recommendations.push("🧪 Using test Stripe keys - safe for development")
      if (webhookSecretTest) {
        recommendations.push("✅ Test webhook secret is configured")
      } else if (webhookSecret) {
        recommendations.push(
          "⚠️ Using general webhook secret with test keys - consider using STRIPE_WEBHOOK_SECRET_TEST",
        )
      }
    }

    if (configurationIssues.length === 0) {
      recommendations.push("✅ Stripe configuration looks good!")
    }

    return NextResponse.json({
      environment,
      webhookSecrets,
      stripeKeys,
      configurationIssues,
      recommendations,
    })
  } catch (error) {
    console.error("Error checking webhook configuration:", error)
    return NextResponse.json(
      {
        error: "Failed to check webhook configuration",
        details: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
