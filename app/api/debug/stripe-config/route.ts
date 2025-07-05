import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY

    if (!stripeKey) {
      return NextResponse.json({
        stripeKeyExists: false,
        stripeKeyPrefix: "Not set",
        isTestMode: false,
        isLiveMode: false,
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
        error: "STRIPE_SECRET_KEY environment variable is not set",
      })
    }

    const stripeKeyPrefix = stripeKey.substring(0, 8)
    const isTestMode = stripeKey.startsWith("sk_test_")
    const isLiveMode = stripeKey.startsWith("sk_live_")

    return NextResponse.json({
      stripeKeyExists: true,
      stripeKeyPrefix,
      isTestMode,
      isLiveMode,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      vercelEnv: process.env.VERCEL_ENV,
      keyLength: stripeKey.length,
      // Don't expose the actual key, just validation info
      keyValidFormat: stripeKey.length > 20 && (isTestMode || isLiveMode),
    })
  } catch (error) {
    console.error("Error checking Stripe config:", error)
    return NextResponse.json({ error: "Failed to check Stripe configuration" }, { status: 500 })
  }
}
