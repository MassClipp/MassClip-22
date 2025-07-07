import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Determine environment and select appropriate keys (same logic as lib/stripe.ts)
    const isProduction = process.env.VERCEL_ENV === "production"
    const isDevelopment = process.env.NODE_ENV === "development"
    const isPreview = process.env.VERCEL_ENV === "preview"

    // Use test keys for development and preview environments, live keys only for production
    const useTestKeys = isDevelopment || isPreview || !isProduction

    // Select the appropriate Stripe secret key
    const intendedStripeKey = useTestKeys ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY

    // Fallback to regular key if test key is not available
    const finalStripeKey = intendedStripeKey || process.env.STRIPE_SECRET_KEY

    // Check what we actually have
    const hasTestKey = !!process.env.STRIPE_SECRET_KEY_TEST
    const hasLiveKey = !!process.env.STRIPE_SECRET_KEY
    const hasRegularKey = !!process.env.STRIPE_SECRET_KEY

    // Determine actual mode based on the key we're using
    const actuallyUsingTestMode = finalStripeKey?.startsWith("sk_test_")
    const actuallyUsingLiveMode = finalStripeKey?.startsWith("sk_live_")

    // Check webhook secrets
    const testSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST
    const liveSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE
    const hasTestSecret = !!testSecret
    const hasLiveSecret = !!liveSecret

    // Determine which secret should be used based on actual key mode
    const correctSecretAvailable = actuallyUsingTestMode ? hasTestSecret : actuallyUsingLiveMode ? hasLiveSecret : false

    // Identify configuration issues
    const configurationIssues: string[] = []

    if (!hasRegularKey && !hasTestKey) {
      configurationIssues.push("No Stripe secret keys found (need STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST)")
    }

    if (useTestKeys && !hasTestKey) {
      configurationIssues.push("Development environment detected but STRIPE_SECRET_KEY_TEST is missing")
    }

    if (!hasTestSecret) {
      configurationIssues.push("STRIPE_WEBHOOK_SECRET_TEST environment variable is not set")
    }

    if (!hasLiveSecret) {
      configurationIssues.push("STRIPE_WEBHOOK_SECRET_LIVE environment variable is not set")
    }

    if (actuallyUsingTestMode && !hasTestSecret) {
      configurationIssues.push("Using test Stripe key but STRIPE_WEBHOOK_SECRET_TEST is missing")
    }

    if (actuallyUsingLiveMode && !hasLiveSecret) {
      configurationIssues.push("Using live Stripe key but STRIPE_WEBHOOK_SECRET_LIVE is missing")
    }

    // Get key type for display
    let keyType = "unknown"
    if (finalStripeKey) {
      if (actuallyUsingTestMode) {
        keyType = `sk_test_...${finalStripeKey.slice(-4)}`
      } else if (actuallyUsingLiveMode) {
        keyType = `sk_live_...${finalStripeKey.slice(-4)}`
      } else {
        keyType = `${finalStripeKey.substring(0, 7)}...${finalStripeKey.slice(-4)}`
      }
    }

    const response = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        isProduction,
        isDevelopment,
        isPreview,
        intendedMode: useTestKeys ? "test" : "live",
        actualMode: actuallyUsingTestMode ? "test" : actuallyUsingLiveMode ? "live" : "unknown",
        detected: actuallyUsingTestMode
          ? "TEST MODE DETECTED"
          : actuallyUsingLiveMode
            ? "LIVE MODE DETECTED"
            : "UNKNOWN MODE",
        keyMismatch: useTestKeys !== actuallyUsingTestMode,
      },
      keyAvailability: {
        hasTestKey,
        hasLiveKey,
        hasRegularKey,
        intendedKey: useTestKeys ? "STRIPE_SECRET_KEY_TEST" : "STRIPE_SECRET_KEY",
        actualKey: actuallyUsingTestMode ? "test key" : actuallyUsingLiveMode ? "live key" : "unknown key",
      },
      webhookSecrets: {
        testSecretSet: hasTestSecret,
        liveSecretSet: hasLiveSecret,
        correctSecretAvailable,
        testSecretLength: testSecret?.length || 0,
        liveSecretLength: liveSecret?.length || 0,
      },
      stripeKeys: {
        secretKeySet: !!finalStripeKey,
        keyType,
        keyLength: finalStripeKey?.length || 0,
      },
      configurationIssues,
      recommendations: [],
    }

    // Add specific recommendations
    if (useTestKeys && !hasTestKey) {
      response.recommendations.push("🔧 Add STRIPE_SECRET_KEY_TEST to your environment for development")
      response.recommendations.push("📝 Get test keys from your Stripe dashboard")
    }

    if (actuallyUsingLiveMode && !isProduction) {
      response.recommendations.push("⚠️ You're using LIVE keys in a non-production environment!")
      response.recommendations.push("🔄 Switch to test keys for development safety")
    }

    if (actuallyUsingTestMode && isProduction) {
      response.recommendations.push("⚠️ You're using TEST keys in production!")
      response.recommendations.push("🔄 Switch to live keys for production")
    }

    if (response.environment.keyMismatch) {
      response.recommendations.push(
        `🔧 Key mismatch: intended ${useTestKeys ? "TEST" : "LIVE"} but using ${actuallyUsingTestMode ? "TEST" : "LIVE"}`,
      )
      if (useTestKeys && !hasTestKey) {
        response.recommendations.push("💡 Add STRIPE_SECRET_KEY_TEST to use test keys in development")
      }
    }

    if (actuallyUsingTestMode && hasTestSecret && !hasLiveSecret) {
      response.recommendations.push("✅ Good! Using test mode with test webhook secret")
      response.recommendations.push("📝 Don't forget to add STRIPE_WEBHOOK_SECRET_LIVE for production")
    }

    if (actuallyUsingLiveMode && hasLiveSecret && !hasTestSecret) {
      response.recommendations.push("⚠️ Using live mode - ensure this is intentional")
      response.recommendations.push("📝 Add STRIPE_WEBHOOK_SECRET_TEST for development testing")
    }

    if (!correctSecretAvailable) {
      const neededSecret = actuallyUsingTestMode ? "STRIPE_WEBHOOK_SECRET_TEST" : "STRIPE_WEBHOOK_SECRET_LIVE"
      response.recommendations.push(`🚨 Missing required webhook secret: ${neededSecret}`)
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
