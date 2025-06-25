import { NextResponse } from "next/server"

export async function GET() {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY

    return NextResponse.json({
      hasStripeSecretKey: !!stripeSecretKey,
      keyPrefix: stripeSecretKey ? stripeSecretKey.substring(0, 7) + "..." : null,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check environment variables",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
