import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY
    const hasTestSecret = !!process.env.STRIPE_WEBHOOK_SECRET_TEST
    const hasLiveSecret = !!process.env.STRIPE_WEBHOOK_SECRET_LIVE
    const hasCorrectSecret = isTestMode ? hasTestSecret : hasLiveSecret

    const result = {
      environment: isTestMode ? "test" : "live",
      hasStripeKey,
      keyType: process.env.STRIPE_SECRET_KEY?.substring(0, 7) + "..." || "not set",
      hasTestSecret,
      hasLiveSecret,
      hasCorrectSecret,
      recommendations: [] as string[],
    }

    if (!hasStripeKey) {
      result.recommendations.push("STRIPE_SECRET_KEY environment variable is not set")
    }

    if (!hasCorrectSecret) {
      if (isTestMode) {
        result.recommendations.push("STRIPE_WEBHOOK_SECRET_TEST environment variable is not set")
        result.recommendations.push("Get this from your Stripe Dashboard > Webhooks > Test webhook endpoint")
      } else {
        result.recommendations.push("STRIPE_WEBHOOK_SECRET_LIVE environment variable is not set")
        result.recommendations.push("Get this from your Stripe Dashboard > Webhooks > Live webhook endpoint")
      }
    }

    if (isTestMode && !hasTestSecret) {
      result.recommendations.push("You're in test mode but missing the test webhook secret")
    }

    if (!isTestMode && !hasLiveSecret) {
      result.recommendations.push("You're in live mode but missing the live webhook secret")
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Webhook secrets debug error:", error)
    return NextResponse.json(
      {
        error: "Failed to check webhook secrets",
        details: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
