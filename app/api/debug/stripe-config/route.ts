import { NextResponse } from "next/server"

export async function GET() {
  try {
    const config = {
      stripeKeyExists: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || "N/A",
      isTestMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || false,
      isLiveMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") || false,
      environment: process.env.NODE_ENV,
    }

    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json({ error: "Failed to check configuration" }, { status: 500 })
  }
}
