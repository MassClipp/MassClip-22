import { NextResponse } from "next/server"

export async function GET() {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST
    const vercelEnv = process.env.VERCEL_ENV || process.env.NODE_ENV || "development"

    let keyType: "test" | "live" | "unknown" = "unknown"
    let keyPrefix = "none"

    if (stripeKey) {
      keyPrefix = stripeKey.substring(0, 8)
      if (stripeKey.startsWith("sk_test_")) {
        keyType = "test"
      } else if (stripeKey.startsWith("sk_live_")) {
        keyType = "live"
      }
    }

    return NextResponse.json({
      stripe: {
        hasStripeKey: !!stripeKey,
        hasTestKey: !!stripeTestKey,
        keyType,
        keyPrefix,
        environment: vercelEnv,
      },
      environment: {
        vercelEnv,
        nodeEnv: process.env.NODE_ENV,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ [Environment Info] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to get environment info",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
