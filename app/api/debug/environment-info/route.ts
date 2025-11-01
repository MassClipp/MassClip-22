import { NextResponse } from "next/server"
import { getSiteUrl, getWebhookUrl, isPreviewEnvironment, isProductionEnvironment } from "@/lib/url-utils"

export async function GET() {
  try {
    const vercelEnv = process.env.VERCEL_ENV || "development"
    const nodeEnv = process.env.NODE_ENV || "development"
    const vercelUrl = process.env.VERCEL_URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

    const isProduction = isProductionEnvironment()
    const isPreview = isPreviewEnvironment()
    const isDevelopment = vercelEnv === "development"

    // Get current environment URLs
    const currentSiteUrl = getSiteUrl()
    const webhookUrl = getWebhookUrl()

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
      currentSiteUrl,
      webhookUrl,
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

    if (isPreview && webhookUrl.includes("massclip.pro")) {
      environmentInfo.recommendations.push({
        type: "warning",
        message: "Webhook URL points to production in preview environment",
        suggestion:
          "Webhooks may not reach your preview deployment. Consider using ngrok or updating webhook endpoints in Stripe dashboard for testing.",
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
