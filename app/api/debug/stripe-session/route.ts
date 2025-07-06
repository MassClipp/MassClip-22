import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Debug Stripe Session] Starting session debug")

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    console.log("📋 [Debug Stripe Session] Debugging session:", {
      sessionId: sessionId,
      sessionIdLength: sessionId.length,
      sessionIdPrefix: sessionId.substring(0, 10),
      isTestSession: sessionId.startsWith("cs_test_"),
      isLiveSession: sessionId.startsWith("cs_live_"),
    })

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST

    const environment = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      hasStripeKey: !!stripeSecretKey,
      hasStripeTestKey: !!stripeTestKey,
      stripeKeyType: stripeSecretKey?.startsWith("sk_test_")
        ? "test"
        : stripeSecretKey?.startsWith("sk_live_")
          ? "live"
          : "unknown",
      stripeTestKeyType: stripeTestKey?.startsWith("sk_test_")
        ? "test"
        : stripeTestKey?.startsWith("sk_live_")
          ? "live"
          : "unknown",
    }

    console.log("🔑 [Debug Stripe Session] Environment check:", environment)

    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          error: "Missing STRIPE_SECRET_KEY",
          environment,
          recommendation: "Set STRIPE_SECRET_KEY environment variable",
        },
        { status: 500 },
      )
    }

    // Determine which key to use
    const sessionIsTest = sessionId.startsWith("cs_test_")
    const keyIsTest = stripeSecretKey.startsWith("sk_test_")

    let keyToUse = stripeSecretKey
    let keySource = "STRIPE_SECRET_KEY"

    // If session is test but main key is live, try to use test key
    if (sessionIsTest && !keyIsTest && stripeTestKey) {
      keyToUse = stripeTestKey
      keySource = "STRIPE_SECRET_KEY_TEST"
    }

    const finalKeyIsTest = keyToUse.startsWith("sk_test_")

    console.log("🔧 [Debug Stripe Session] Key selection:", {
      sessionType: sessionIsTest ? "test" : "live",
      mainKeyType: keyIsTest ? "test" : "live",
      selectedKeyType: finalKeyIsTest ? "test" : "live",
      keySource,
      isMatch: sessionIsTest === finalKeyIsTest,
    })

    if (sessionIsTest !== finalKeyIsTest) {
      return NextResponse.json(
        {
          error: "Test/Live mode mismatch",
          details: `Session is ${sessionIsTest ? "test" : "live"} but selected key is ${finalKeyIsTest ? "test" : "live"}`,
          environment,
          keySource,
          sessionType: sessionIsTest ? "test" : "live",
          keyType: finalKeyIsTest ? "test" : "live",
          recommendation: sessionIsTest
            ? "Use a test Stripe key (sk_test_...) for test sessions"
            : "Use a live Stripe key (sk_live_...) for live sessions",
        },
        { status: 400 },
      )
    }

    // Initialize Stripe and try to retrieve session
    const stripe = new Stripe(keyToUse, { apiVersion: "2023-08-16" })

    try {
      console.log("📡 [Debug Stripe Session] Attempting to retrieve session...")
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      console.log("✅ [Debug Stripe Session] Session retrieved successfully")

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          status: session.status,
          payment_status: session.payment_status,
          mode: session.mode,
          amount_total: session.amount_total,
          currency: session.currency,
          created: new Date(session.created * 1000),
          expires_at: session.expires_at ? new Date(session.expires_at * 1000) : null,
          customer_email: session.customer_details?.email,
          metadata: session.metadata,
        },
        environment,
        keySource,
        keyType: finalKeyIsTest ? "test" : "live",
      })
    } catch (stripeError: any) {
      console.error("❌ [Debug Stripe Session] Stripe error:", {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        statusCode: stripeError.statusCode,
      })

      return NextResponse.json(
        {
          error: "Session not found",
          details: stripeError.message,
          stripeError: {
            type: stripeError.type,
            code: stripeError.code,
            message: stripeError.message,
            statusCode: stripeError.statusCode,
          },
          environment,
          keySource,
          keyType: finalKeyIsTest ? "test" : "live",
          recommendation:
            stripeError.statusCode === 404
              ? `Verify the session exists in your Stripe ${finalKeyIsTest ? "test" : "live"} dashboard`
              : "Check your Stripe configuration and try again",
        },
        { status: stripeError.statusCode || 400 },
      )
    }
  } catch (error) {
    console.error("❌ [Debug Stripe Session] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Debug failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
