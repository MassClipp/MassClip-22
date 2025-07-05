import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Detect current environment
    const nodeEnv = process.env.NODE_ENV || "development"
    const vercelEnv = process.env.VERCEL_ENV || "development"
    const vercelUrl = process.env.VERCEL_URL
    const isProduction = vercelEnv === "production"
    const isPreview = vercelEnv === "preview"

    // Determine webhook URL based on environment
    let webhookUrl = ""
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/webhook`
    } else if (vercelUrl) {
      webhookUrl = `https://${vercelUrl}/api/stripe/webhook`
    } else {
      webhookUrl = "http://localhost:3000/api/stripe/webhook"
    }

    // Check Stripe configuration
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const isLiveStripeKey = stripeKey?.startsWith("sk_live_")
    const isTestStripeKey = stripeKey?.startsWith("sk_test_")

    // Determine expected session type
    let expectedSessionType = "unknown"
    if (isLiveStripeKey) {
      expectedSessionType = "cs_live_..."
    } else if (isTestStripeKey) {
      expectedSessionType = "cs_test_..."
    }

    // Check for potential mismatches
    const potentialIssues = []

    if (isPreview && isLiveStripeKey) {
      potentialIssues.push({
        type: "environment_mismatch",
        severity: "high",
        message: "Using live Stripe keys in preview environment",
        recommendation: "Consider using test keys for preview deployments",
      })
    }

    if (isProduction && isTestStripeKey) {
      potentialIssues.push({
        type: "environment_mismatch",
        severity: "medium",
        message: "Using test Stripe keys in production environment",
        recommendation: "Ensure you're using live keys for production",
      })
    }

    return NextResponse.json({
      nodeEnv,
      vercelEnv,
      vercelUrl,
      isProduction,
      isPreview,
      webhookUrl,
      stripeKeyType: isLiveStripeKey ? "live" : isTestStripeKey ? "test" : "unknown",
      expectedSessionType,
      potentialIssues,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error getting environment info:", error)
    return NextResponse.json({ error: "Failed to get environment information" }, { status: 500 })
  }
}
