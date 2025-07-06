import { NextResponse } from "next/server"

export async function GET() {
  try {
    const vercelEnv = process.env.VERCEL_ENV || "development"
    const nodeEnv = process.env.NODE_ENV || "development"
    const vercelUrl = process.env.VERCEL_URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

    const isProduction = vercelEnv === "production"
    const isPreview = vercelEnv === "preview"
    const isDevelopment = vercelEnv === "development"

    // Determine webhook URL
    let webhookUrl = siteUrl
    if (!webhookUrl && vercelUrl) {
      webhookUrl = `https://${vercelUrl}`
    }
    if (!webhookUrl) {
      webhookUrl = "http://localhost:3000"
    }

    // Check Stripe configuration
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST
    const activeKey = isProduction ? stripeKey : stripeTestKey || stripeKey
    const keyType = activeKey?.startsWith("sk_live_") ? "live" : "test"

    const environmentInfo = {
      vercelEnv,
      nodeEnv,
      isProduction,
      isPreview,
      isDevelopment,
      vercelUrl,
      siteUrl,
      webhookUrl: `${webhookUrl}/api/stripe/webhook`,
      stripe: {
        hasMainKey: !!stripeKey,
        hasTestKey: !!stripeTestKey,
        activeKeyType: keyType,
        expectedSessionType: keyType === "live" ? "cs_live_..." : "cs_test_...",
        keySource: isProduction
          ? "STRIPE_SECRET_KEY"
          : stripeTestKey
            ? "STRIPE_SECRET_KEY_TEST"
            : "STRIPE_SECRET_KEY (fallback)",
      },
      recommendations: [],
    }

    // Add recommendations based on configuration
    if (isPreview && keyType === "live") {
      environmentInfo.recommendations.push({
        type: "warning",
        message: "Using live Stripe keys in preview environment",
        suggestion: "Consider using STRIPE_SECRET_KEY_TEST for preview deployments",
      })
    }

    if (!stripeTestKey && !isProduction) {
      environmentInfo.recommendations.push({
        type: "info",
        message: "No test key configured",
        suggestion: "Add STRIPE_SECRET_KEY_TEST for better environment separation",
      })
    }

    return NextResponse.json(environmentInfo)
  } catch (error: any) {
    console.error(`❌ [Environment Info] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to get environment information",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
