import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check environment
    const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
    const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")

    // Check webhook secrets
    const testSecretSet = !!process.env.STRIPE_WEBHOOK_SECRET_TEST
    const liveSecretSet = !!process.env.STRIPE_WEBHOOK_SECRET_LIVE

    // Determine which secret should be used
    const correctSecretAvailable = isTestMode ? testSecretSet : liveSecretSet

    // Check Stripe keys
    const secretKeySet = !!process.env.STRIPE_SECRET_KEY
    const keyType = process.env.STRIPE_SECRET_KEY?.substring(0, 7) + "..."

    // Identify configuration issues
    const configurationIssues: string[] = []

    if (!secretKeySet) {
      configurationIssues.push("STRIPE_SECRET_KEY is not set")
    }

    if (isTestMode && !testSecretSet) {
      configurationIssues.push("STRIPE_WEBHOOK_SECRET_TEST is required for test mode")
    }

    if (isLiveMode && !liveSecretSet) {
      configurationIssues.push("STRIPE_WEBHOOK_SECRET_LIVE is required for live mode")
    }

    if (!isTestMode && !isLiveMode) {
      configurationIssues.push("Unable to determine Stripe environment (key doesn't start with sk_test_ or sk_live_)")
    }

    const result = {
      environment: {
        isTestMode,
        isLiveMode,
        currentMode: isTestMode ? "test" : isLiveMode ? "live" : "unknown",
      },
      webhookSecrets: {
        testSecretSet,
        liveSecretSet,
        correctSecretAvailable,
      },
      stripeKeys: {
        secretKeySet,
        keyType,
      },
      configurationIssues,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Webhook secrets check error:", error)
    return NextResponse.json(
      {
        error: "Failed to check webhook configuration",
        details: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
