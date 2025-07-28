import { NextResponse } from "next/server"

export async function GET() {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    const configured = !!(stripeSecretKey && stripePublishableKey)

    return NextResponse.json({
      configured,
      hasSecretKey: !!stripeSecretKey,
      hasPublishableKey: !!stripePublishableKey,
      hasWebhookSecret: !!stripeWebhookSecret,
      secretKeyPrefix: stripeSecretKey ? stripeSecretKey.substring(0, 8) + "..." : null,
      publishableKeyPrefix: stripePublishableKey ? stripePublishableKey.substring(0, 8) + "..." : null,
      environment: stripeSecretKey?.includes("_test_") ? "test" : "live",
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        configured: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
