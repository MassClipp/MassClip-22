import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    const envCheck = {
      STRIPE_SECRET_KEY: {
        present: !!stripeSecretKey,
        length: stripeSecretKey?.length || 0,
        prefix: stripeSecretKey?.substring(0, 7) || "missing",
        isLive: stripeSecretKey?.startsWith("sk_live_") || false,
        isTest: stripeSecretKey?.startsWith("sk_test_") || false,
      },
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: {
        present: !!stripePublishableKey,
        length: stripePublishableKey?.length || 0,
        prefix: stripePublishableKey?.substring(0, 7) || "missing",
        isLive: stripePublishableKey?.startsWith("pk_live_") || false,
        isTest: stripePublishableKey?.startsWith("pk_test_") || false,
      },
      STRIPE_WEBHOOK_SECRET: {
        present: !!stripeWebhookSecret,
        length: stripeWebhookSecret?.length || 0,
        prefix: stripeWebhookSecret?.substring(0, 7) || "missing",
      },
      NEXT_PUBLIC_APP_URL: {
        present: !!appUrl,
        value: appUrl || "missing",
      },
    }

    const configured =
      envCheck.STRIPE_SECRET_KEY.present &&
      envCheck.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.present &&
      envCheck.NEXT_PUBLIC_APP_URL.present

    const keyMismatch = envCheck.STRIPE_SECRET_KEY.isLive !== envCheck.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.isLive

    return NextResponse.json({
      configured,
      keyMismatch,
      environment: envCheck.STRIPE_SECRET_KEY.isLive ? "live" : "test",
      checks: envCheck,
      warnings: keyMismatch ? ["Secret key and publishable key environment mismatch"] : [],
    })
  } catch (error: any) {
    console.error("❌ [Stripe Environment] Error:", error)
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
