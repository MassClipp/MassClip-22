import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const headers = request.headers
    const host = headers.get("host") || ""
    const userAgent = headers.get("user-agent") || ""

    // Detect Vercel environment
    const vercelEnv = process.env.VERCEL_ENV || process.env.NODE_ENV
    const isProduction = vercelEnv === "production"
    const isPreview = vercelEnv === "preview"
    const isDevelopment = vercelEnv === "development"

    // Get current URL info
    const protocol = headers.get("x-forwarded-proto") || "http"
    const currentUrl = `${protocol}://${host}`

    // Detect if this is a Vercel preview deployment
    const isVercelPreview =
      host.includes(".vercel.app") && !host.includes("massclip1-git-preview-massclippp-gmailcoms-projects.vercel.app")

    // Get Stripe configuration
    const stripeKeyExists = !!process.env.STRIPE_SECRET_KEY
    const stripeKeyPrefix = process.env.STRIPE_SECRET_KEY?.substring(0, 8) || "Not set"
    const isLiveStripeKey = stripeKeyPrefix.startsWith("sk_live_")
    const isTestStripeKey = stripeKeyPrefix.startsWith("sk_test_")

    // Webhook URL detection
    const webhookUrl = `${currentUrl}/api/stripe/webhook`

    // Environment analysis
    const environmentMismatch = (isPreview || isDevelopment) && isLiveStripeKey
    const recommendedAction = environmentMismatch
      ? "Switch to test Stripe keys for non-production environments"
      : "Environment configuration looks correct"

    const environmentInfo = {
      // Environment detection
      isProduction,
      isPreview,
      isDevelopment,
      isVercelPreview,
      vercelEnv,
      nodeEnv: process.env.NODE_ENV,

      // URL info
      currentUrl,
      host,
      webhookUrl,

      // Stripe info
      stripeKeyExists,
      stripeKeyPrefix,
      isLiveStripeKey,
      isTestStripeKey,

      // Analysis
      environmentMismatch,
      recommendedAction,

      // Additional context
      timestamp: new Date().toISOString(),
      userAgent: userAgent.substring(0, 100), // Truncate for security

      // Environment variables (safe ones only)
      envVars: {
        VERCEL_URL: process.env.VERCEL_URL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      },
    }

    return NextResponse.json(environmentInfo)
  } catch (error) {
    console.error("Environment info error:", error)
    return NextResponse.json(
      {
        error: "Failed to get environment information",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
