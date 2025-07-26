import { NextResponse } from "next/server"

export async function GET() {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET

    const isLiveKey = stripeSecretKey?.startsWith("sk_live_")
    const isTestKey = stripeSecretKey?.startsWith("sk_test_")
    const isLivePubKey = stripePublishableKey?.startsWith("pk_live_")
    const isTestPubKey = stripePublishableKey?.startsWith("pk_test_")

    const configured = !!(stripeSecretKey && stripePublishableKey)

    return NextResponse.json({
      configured,
      hasSecretKey: !!stripeSecretKey,
      hasPublishableKey: !!stripePublishableKey,
      hasWebhookSecret: !!webhookSecret,
      keyTypes: {
        secretKey: isLiveKey ? "live" : isTestKey ? "test" : "unknown",
        publishableKey: isLivePubKey ? "live" : isTestPubKey ? "test" : "unknown",
      },
      keyLengths: {
        secretKey: stripeSecretKey?.length || 0,
        publishableKey: stripePublishableKey?.length || 0,
        webhookSecret: webhookSecret?.length || 0,
      },
      environment: isLiveKey ? "production" : "test",
      keysMatch: (isLiveKey && isLivePubKey) || (isTestKey && isTestPubKey),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        configured: false,
        error: "Failed to check Stripe environment",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
