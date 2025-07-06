import { NextResponse } from "next/server"

export async function GET() {
  try {
    const vercelEnv = process.env.VERCEL_ENV || process.env.NODE_ENV || "development"
    const nodeEnv = process.env.NODE_ENV || "development"
    const isProduction = vercelEnv === "production"

    // Get site URL info
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "localhost:3000"
    const webhookUrl = `${siteUrl}/api/stripe/webhook`

    // Check Stripe keys
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST

    const environmentInfo = {
      vercelEnv,
      nodeEnv,
      isProduction,
      siteUrl,
      webhookUrl,
      stripeConfiguration: {
        hasMainKey: !!stripeKey,
        hasTestKey: !!stripeTestKey,
        mainKeyType: stripeKey ? (stripeKey.startsWith("sk_live_") ? "live" : "test") : null,
        testKeyType: stripeTestKey ? (stripeTestKey.startsWith("sk_test_") ? "test" : "live") : null,
        recommendedForEnvironment: isProduction ? "live keys" : "test keys",
      },
      timestamp: new Date().toISOString(),
    }

    console.log("🌍 [Environment Info] Generated:", environmentInfo)

    return NextResponse.json(environmentInfo)
  } catch (error: any) {
    console.error("❌ [Environment Info] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to get environment information",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
