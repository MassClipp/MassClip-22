import { NextResponse } from "next/server"

export async function GET() {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL

    return NextResponse.json({
      stripe: {
        hasStripeKey: !!stripeKey,
        keyType: stripeKey
          ? stripeKey.startsWith("sk_test_")
            ? "test"
            : stripeKey.startsWith("sk_live_")
              ? "live"
              : "unknown"
          : "unknown",
        keyPrefix: stripeKey ? stripeKey.substring(0, 8) + "..." : "Not set",
        environment: process.env.NODE_ENV || "unknown",
      },
      urls: {
        siteUrl,
        vercelUrl,
        currentUrl: siteUrl || vercelUrl || "Not set",
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Environment info error:", error)
    return NextResponse.json(
      {
        error: "Failed to get environment info",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
