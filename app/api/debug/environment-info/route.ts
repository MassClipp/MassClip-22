import { NextResponse } from "next/server"

export async function GET() {
  try {
    const vercelEnv = process.env.VERCEL_ENV || "development"
    const nodeEnv = process.env.NODE_ENV || "development"
    const vercelUrl = process.env.VERCEL_URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

    // Determine current environment
    let currentEnvironment = "development"
    if (vercelEnv === "production") {
      currentEnvironment = "production"
    } else if (vercelEnv === "preview") {
      currentEnvironment = "preview"
    }

    // Check Stripe configuration
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST

    let activeStripeKey: string | undefined
    let stripeMode = "unknown"

    if (currentEnvironment === "production") {
      activeStripeKey = stripeKey
    } else {
      activeStripeKey = stripeTestKey || stripeKey
    }

    if (activeStripeKey) {
      const keyPrefix = activeStripeKey.substring(0, 7)
      stripeMode = keyPrefix === "sk_live" ? "live" : keyPrefix === "sk_test" ? "test" : "unknown"
    }

    // Generate webhook URL
    const baseUrl = siteUrl || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000")
    const webhookUrl = `${baseUrl}/api/stripe/webhook`

    const environmentInfo = {
      success: true,
      currentEnvironment,
      vercelEnvironment: vercelEnv,
      nodeEnvironment: nodeEnv,
      urls: {
        vercelUrl,
        siteUrl,
        webhookUrl,
      },
      stripe: {
        hasMainKey: !!stripeKey,
        hasTestKey: !!stripeTestKey,
        activeKeySource:
          currentEnvironment === "production"
            ? "STRIPE_SECRET_KEY"
            : stripeTestKey
              ? "STRIPE_SECRET_KEY_TEST"
              : "STRIPE_SECRET_KEY (fallback)",
        mode: stripeMode,
        expectedSessionType: stripeMode === "live" ? "cs_live_..." : "cs_test_...",
      },
      recommendations: [],
    }

    // Add recommendations based on configuration
    if (currentEnvironment !== "production" && stripeMode === "live") {
      environmentInfo.recommendations.push(
        "Consider using test Stripe keys (STRIPE_SECRET_KEY_TEST) for preview/development environments",
      )
    }

    if (!stripeTestKey && currentEnvironment !== "production") {
      environmentInfo.recommendations.push(
        "Add STRIPE_SECRET_KEY_TEST environment variable for safer preview/development testing",
      )
    }

    return NextResponse.json(environmentInfo)
  } catch (error: any) {
    console.error("❌ [Environment Info] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get environment information",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
