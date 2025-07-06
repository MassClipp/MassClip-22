import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function GET() {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST

    if (!stripeKey && !stripeTestKey) {
      return NextResponse.json(
        {
          error: "No Stripe keys configured",
          config: {
            hasMainKey: false,
            hasTestKey: false,
          },
        },
        { status: 500 },
      )
    }

    const config = {
      hasMainKey: !!stripeKey,
      hasTestKey: !!stripeTestKey,
      mainKeyType: stripeKey?.startsWith("sk_test_") ? "test" : stripeKey?.startsWith("sk_live_") ? "live" : "unknown",
      testKeyType: stripeTestKey?.startsWith("sk_test_")
        ? "test"
        : stripeTestKey?.startsWith("sk_live_")
          ? "live"
          : "unknown",
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    }

    // Test Stripe connection
    let connectionTest = null
    try {
      const testKey = stripeTestKey || stripeKey
      if (testKey) {
        const stripe = new Stripe(testKey, { apiVersion: "2023-08-16" })
        const account = await stripe.accounts.retrieve()
        connectionTest = {
          success: true,
          accountId: account.id,
          country: account.country,
          currency: account.default_currency,
        }
      }
    } catch (error) {
      connectionTest = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }

    console.log("🔧 [Stripe Config]:", { config, connectionTest })

    return NextResponse.json({
      success: true,
      config,
      connectionTest,
    })
  } catch (error) {
    console.error("❌ [Stripe Config] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to get Stripe config",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
