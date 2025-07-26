import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [Stripe Env] Checking Stripe environment configuration`)

    const hasStripeSecretKey = !!process.env.STRIPE_SECRET_KEY
    const hasStripePublishableKey = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET_LIVE || !!process.env.STRIPE_WEBHOOK_SECRET

    const secretKeyType = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
      ? "live"
      : process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
        ? "test"
        : "unknown"

    const publishableKeyType = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_live_")
      ? "live"
      : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_")
        ? "test"
        : "unknown"

    const configured = hasStripeSecretKey && hasStripePublishableKey && hasWebhookSecret

    return NextResponse.json({
      configured,
      hasStripeSecretKey,
      hasStripePublishableKey,
      hasWebhookSecret,
      secretKeyType,
      publishableKeyType,
      keysMatch: secretKeyType === publishableKeyType,
      environment: secretKeyType,
      details: {
        STRIPE_SECRET_KEY: hasStripeSecretKey
          ? `${secretKeyType} key (${process.env.STRIPE_SECRET_KEY?.substring(0, 12)}...)`
          : "Missing",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: hasStripePublishableKey
          ? `${publishableKeyType} key (${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 12)}...)`
          : "Missing",
        STRIPE_WEBHOOK_SECRET: hasWebhookSecret ? "Present" : "Missing",
        STRIPE_WEBHOOK_SECRET_LIVE: !!process.env.STRIPE_WEBHOOK_SECRET_LIVE ? "Present" : "Missing",
      },
    })
  } catch (error: any) {
    console.error("❌ [Stripe Env] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to check Stripe environment",
        details: error.message,
        configured: false,
      },
      { status: 500 },
    )
  }
}
