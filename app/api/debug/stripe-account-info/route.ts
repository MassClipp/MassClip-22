import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function GET() {
  try {
    // Get all Stripe-related environment variables
    const stripeEnvVars = {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_SECRET_KEY_TEST: process.env.STRIPE_SECRET_KEY_TEST,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      STRIPE_WEBHOOK_SECRET_LIVE: process.env.STRIPE_WEBHOOK_SECRET_LIVE,
      STRIPE_WEBHOOK_SECRET_TEST: process.env.STRIPE_WEBHOOK_SECRET_TEST,
      STRIPE_CLIENT_ID: process.env.STRIPE_CLIENT_ID,
    }

    // Mask sensitive parts but show enough to identify
    const maskedEnvVars = Object.entries(stripeEnvVars).reduce(
      (acc, [key, value]) => {
        if (value) {
          if (key.includes("SECRET") || key.includes("WEBHOOK")) {
            // Show first 12 and last 4 characters for secrets
            acc[key] =
              value.length > 16
                ? `${value.substring(0, 12)}...${value.substring(value.length - 4)}`
                : `${value.substring(0, 8)}...`
          } else {
            // Show first 16 and last 4 for other keys
            acc[key] = value.length > 20 ? `${value.substring(0, 16)}...${value.substring(value.length - 4)}` : value
          }
        } else {
          acc[key] = null
        }
        return acc
      },
      {} as Record<string, string | null>,
    )

    // Determine which key is being used
    const activeSecretKey = process.env.STRIPE_SECRET_KEY
    const keyType = activeSecretKey?.startsWith("sk_live_")
      ? "LIVE"
      : activeSecretKey?.startsWith("sk_test_")
        ? "TEST"
        : "UNKNOWN"

    // Get account information from Stripe
    let accountInfo = null
    let accountError = null

    try {
      const account = await stripe.accounts.retrieve()
      accountInfo = {
        id: account.id,
        email: account.email,
        display_name: account.display_name || account.business_profile?.name,
        country: account.country,
        default_currency: account.default_currency,
        type: account.type,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      }
    } catch (error: any) {
      accountError = error.message
    }

    // Test session retrieval with a known session ID if provided
    const testSessionId = "cs_live_b1TVZJXzwj1bz6e25x9t9GwOp7dTLPH95PsLtT71wys2jK4hCVUDrO1Vb"
    let sessionTest = null
    let sessionError = null

    try {
      const session = await stripe.checkout.sessions.retrieve(testSessionId)
      sessionTest = {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_email,
        amount_total: session.amount_total,
        currency: session.currency,
        created: new Date(session.created * 1000).toISOString(),
      }
    } catch (error: any) {
      sessionError = error.message
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
      },
      stripe_config: {
        active_key_type: keyType,
        active_key_prefix: activeSecretKey ? `${activeSecretKey.substring(0, 12)}...` : null,
        environment_variables: maskedEnvVars,
      },
      stripe_account: {
        info: accountInfo,
        error: accountError,
      },
      session_test: {
        session_id: testSessionId,
        result: sessionTest,
        error: sessionError,
      },
      recommendations: [
        keyType !== "LIVE" ? "⚠️ Not using live keys - this might cause session lookup issues" : "✅ Using live keys",
        !accountInfo
          ? "❌ Cannot retrieve account info - check API key validity"
          : "✅ Account info retrieved successfully",
        sessionError ? `❌ Session lookup failed: ${sessionError}` : "✅ Session lookup successful",
      ],
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to get Stripe account info",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
