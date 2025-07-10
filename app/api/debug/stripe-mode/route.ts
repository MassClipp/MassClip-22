import { NextResponse } from "next/server"
import { stripe, isTestMode } from "@/lib/stripe"

export async function GET() {
  try {
    // Test the Stripe connection
    const account = await stripe.accounts.retrieve()

    return NextResponse.json({
      message: "Stripe configuration check",
      timestamp: new Date().toISOString(),
      stripe: {
        testMode: isTestMode,
        mode: isTestMode ? "TEST" : "LIVE",
        accountId: account.id,
        country: account.country,
        defaultCurrency: account.default_currency,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        STRIPE_FORCE_TEST: process.env.STRIPE_FORCE_TEST,
        hasTestKey: !!process.env.STRIPE_SECRET_KEY_TEST,
        hasLiveKey: !!process.env.STRIPE_SECRET_KEY,
      },
    })
  } catch (error: any) {
    console.error("❌ [Stripe Debug] Error:", error)
    return NextResponse.json(
      {
        error: error.message,
        testMode: isTestMode,
        mode: isTestMode ? "TEST" : "LIVE",
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          STRIPE_FORCE_TEST: process.env.STRIPE_FORCE_TEST,
          hasTestKey: !!process.env.STRIPE_SECRET_KEY_TEST,
          hasLiveKey: !!process.env.STRIPE_SECRET_KEY,
        },
      },
      { status: 500 },
    )
  }
}
