import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Determine which Stripe key to use based on environment
    const vercelEnv = process.env.VERCEL_ENV || "development"
    const isProduction = vercelEnv === "production"

    // Choose the appropriate key
    let stripeKey: string | undefined
    let keyType: string

    if (isProduction) {
      stripeKey = process.env.STRIPE_SECRET_KEY
      keyType = "live"
    } else {
      // Use test key for preview/development
      stripeKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
      keyType = process.env.STRIPE_SECRET_KEY_TEST ? "test" : "fallback"
    }

    if (!stripeKey) {
      return NextResponse.json(
        {
          error: "No Stripe key available",
          recommendation: isProduction
            ? "Set STRIPE_SECRET_KEY for production environment"
            : "Set STRIPE_SECRET_KEY_TEST for preview/development environment",
          configurationSteps: [
            "1. Go to your Stripe dashboard",
            `2. Get your ${isProduction ? "live" : "test"} secret key`,
            `3. Set ${isProduction ? "STRIPE_SECRET_KEY" : "STRIPE_SECRET_KEY_TEST"} in Vercel environment variables`,
            "4. Redeploy your application",
          ],
        },
        { status: 500 },
      )
    }

    // Check if session ID matches key type
    const sessionIsTest = sessionId.startsWith("cs_test_")
    const sessionIsLive = sessionId.startsWith("cs_live_")
    const keyIsTest = stripeKey.startsWith("sk_test_")
    const keyIsLive = stripeKey.startsWith("sk_live_")

    if ((sessionIsTest && keyIsLive) || (sessionIsLive && keyIsTest)) {
      return NextResponse.json(
        {
          error: "Session/Key mode mismatch",
          details: `Session type: ${sessionIsTest ? "test" : "live"}, Key type: ${keyIsTest ? "test" : "live"}`,
          recommendation: sessionIsTest
            ? "Use test Stripe keys (STRIPE_SECRET_KEY_TEST) for test sessions"
            : "Use live Stripe keys (STRIPE_SECRET_KEY) for live sessions",
          sessionType: sessionIsTest ? "test" : "live",
          keyType: keyIsTest ? "test" : "live",
          environment: vercelEnv,
          configurationSteps: [
            "1. Check your session ID prefix (cs_test_ or cs_live_)",
            "2. Ensure you're using the matching Stripe key type",
            "3. For preview/development: use STRIPE_SECRET_KEY_TEST",
            "4. For production: use STRIPE_SECRET_KEY",
          ],
        },
        { status: 400 },
      )
    }

    // Initialize Stripe with the appropriate key
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-06-20",
      typescript: true,
    })

    // Try to retrieve the session
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_email,
        created: session.created * 1000, // Convert to milliseconds
        expires_at: session.expires_at * 1000,
        metadata: session.metadata,
      },
      analysis: {
        isExpired: session.expires_at * 1000 < Date.now(),
        isPaid: session.payment_status === "paid",
        isComplete: session.status === "complete",
        hasMetadata: Object.keys(session.metadata || {}).length > 0,
      },
      environment: {
        vercelEnv,
        keyType,
        sessionType: sessionIsTest ? "test" : "live",
        isProduction,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error debugging Stripe session:", error)

    // Handle specific Stripe errors
    if (error.type === "StripeInvalidRequestError") {
      if (error.code === "resource_missing") {
        return NextResponse.json(
          {
            error: "Session not found",
            details: "The session ID does not exist in your Stripe account",
            recommendation: "Verify the session ID is correct and belongs to the right Stripe account",
            stripeError: error.message,
            configurationSteps: [
              "1. Check the session ID is complete and correct",
              "2. Verify you're using the right Stripe account",
              "3. Ensure the session hasn't expired (24 hour limit)",
              "4. Check test/live mode consistency",
            ],
          },
          { status: 404 },
        )
      }
    }

    return NextResponse.json(
      {
        error: "Failed to debug session",
        details: error.message,
        type: error.type || "unknown",
        code: error.code || "unknown",
      },
      { status: 500 },
    )
  }
}
