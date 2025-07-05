import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const headers = request.headers
    const url = new URL(request.url)

    const environmentInfo = {
      // Vercel-specific environment detection
      vercelEnv: process.env.VERCEL_ENV || "development",
      vercelUrl: process.env.VERCEL_URL,
      isProduction: process.env.NODE_ENV === "production",
      nodeEnv: process.env.NODE_ENV || "development",

      // Current request info
      currentUrl: url.origin,
      host: headers.get("host"),

      // Stripe configuration
      stripeKeyExists: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) || "Not set",

      // Webhook URL (where Stripe sends webhooks)
      webhookUrl: `${url.origin}/api/stripe/webhook`,

      // Other relevant environment info
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(environmentInfo)
  } catch (error) {
    console.error("Error getting environment info:", error)
    return NextResponse.json({ error: "Failed to get environment information" }, { status: 500 })
  }
}
