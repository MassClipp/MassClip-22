import { NextResponse } from "next/server"

export async function GET() {
  try {
    const vercelEnv = process.env.VERCEL_ENV || "development"
    const nodeEnv = process.env.NODE_ENV || "development"
    const isProduction = vercelEnv === "production"
    const isPreview = vercelEnv === "preview"

    // Get current site URL
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL ||
      process.env.VERCEL_URL ||
      "localhost:3000"

    const webhookUrl = `https://${siteUrl}/api/stripe/webhook`

    // Check available Stripe keys
    const liveKey = process.env.STRIPE_SECRET_KEY
    const testKey = process.env.STRIPE_SECRET_KEY_TEST

    return NextResponse.json({
      vercelEnv,
      nodeEnv,
      isProduction,
      isPreview,
      webhookUrl,
      siteUrl,
      availableKeys: {
        hasLiveKey: !!liveKey,
        hasTestKey: !!testKey,
        liveKeyPrefix: liveKey ? liveKey.substring(0, 8) : null,
        testKeyPrefix: testKey ? testKey.substring(0, 8) : null,
      },
      recommendedKey: isProduction ? "live" : "test",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error getting environment info:", error)
    return NextResponse.json({ error: "Failed to get environment info" }, { status: 500 })
  }
}
