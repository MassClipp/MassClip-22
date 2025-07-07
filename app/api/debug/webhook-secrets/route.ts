import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check Stripe key configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const hasStripeKey = !!stripeSecretKey
    const isTestMode = stripeSecretKey?.startsWith("sk_test_")
    const isLiveMode = stripeSecretKey?.startsWith("sk_live_")

    // Check webhook secrets
    const testSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST
    const liveSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE
    const hasTestSecret = !!testSecret
    const hasLiveSecret = !!liveSecret

    // Determine which secret should be used based on current environment
    const correctSecretAvailable = isTestMode ? hasTestSecret : isLiveMode ? hasLiveSecret : false

    // Identify configuration issues
    const configurationIssues: string[] = []

    if (!hasStripeKey) {
      configurationIssues.push("STRIPE_SECRET_KEY environment variable is not set")
    } else if (!isTestMode && !isLiveMode) {
      configurationIssues.push("STRIPE_SECRET_KEY does not start with sk_test_ or sk_live_")
    }

    if (!hasTestSecret) {
      configurationIssues.push("STRIPE_WEBHOOK_SECRET_TEST environment variable is not set")
    }

    if (!hasLiveSecret) {
      configurationIssues.push("STRIPE_WEBHOOK_SECRET_LIVE environment variable is not set")
    }

    if (isTestMode && !hasTestSecret) {
      configurationIssues.push("Using test Stripe key but STRIPE_WEBHOOK_SECRET_TEST is missing")
    }

    if (isLiveMode && !hasLiveSecret) {
      configurationIssues.push("Using live Stripe key but STRIPE_WEBHOOK_SECRET_LIVE is missing")
    }

    // Get key type for display
    let keyType = "unknown"
    if (stripeSecretKey) {
      if (isTestMode) {
        keyType = `sk_test_...${stripeSecretKey.slice(-4)}`
      } else if (isLiveMode) {
        keyType = `sk_live_...${stripeSecretKey.slice(-4)}`
      } else {
        keyType = `${stripeSecretKey.substring(0, 7)}...${stripeSecretKey.slice(-4)}`
      }
    }

    const response = {
      environment: {
        isTestMode,
        isLiveMode,
        currentMode: isTestMode ? "test" : isLiveMode ? "live" : "unknown",
        detected: isTestMode ? "TEST MODE DETECTED" : isLiveMode ? "LIVE MODE DETECTED" : "UNKNOWN MODE",
      },
      webhookSecrets: {
        testSecretSet: hasTestSecret,
        liveSecretSet: hasLiveSecret,
        correctSecretAvailable,
        testSecretLength: testSecret?.length || 0,
        liveSecretLength: liveSecret?.length || 0,
      },
      stripeKeys: {
        secretKeySet: hasStripeKey,
        keyType,
        keyLength: stripeSecretKey?.length || 0,
      },
      configurationIssues,
      recommendations: [],
    }

    // Add specific recommendations
    if (isLiveMode && hasTestSecret && !hasLiveSecret) {
      response.recommendations.push("You're using a LIVE Stripe key but only have a TEST webhook secret configured")
      response.recommendations.push("Add STRIPE_WEBHOOK_SECRET_LIVE to your environment variables")
    }

    if (isTestMode && hasLiveSecret && !hasTestSecret) {
      response.recommendations.push("You're using a TEST Stripe key but only have a LIVE webhook secret configured")
      response.recommendations.push("Add STRIPE_WEBHOOK_SECRET_TEST to your environment variables")
    }

    if (isLiveMode) {
      response.recommendations.push("⚠️ You are currently in LIVE mode - real payments will be processed")
      response.recommendations.push("Switch to test keys (sk_test_) for development and testing")
    }

    if (isTestMode) {
      response.recommendations.push("✅ You are in TEST mode - safe for development and testing")
      response.recommendations.push("Switch to live keys (sk_live_) only for production")
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error checking webhook secrets:", error)
    return NextResponse.json(
      {
        error: "Failed to check webhook configuration",
        details: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
