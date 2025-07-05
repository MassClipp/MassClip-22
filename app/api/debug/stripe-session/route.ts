import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

function getStripeKey(): string {
  const vercelEnv = process.env.VERCEL_ENV || "development"
  const isProduction = vercelEnv === "production"

  let stripeKey: string | undefined

  if (isProduction) {
    stripeKey = process.env.STRIPE_SECRET_KEY
  } else {
    stripeKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
  }

  if (!stripeKey) {
    throw new Error(
      isProduction
        ? "STRIPE_SECRET_KEY environment variable is not set for production"
        : "STRIPE_SECRET_KEY_TEST environment variable is not set for preview/development",
    )
  }

  return stripeKey
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Get the appropriate Stripe key for current environment
    const stripeKey = getStripeKey()
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-06-20",
      typescript: true,
    })

    // Determine expected session type based on key
    const isLiveKey = stripeKey.startsWith("sk_live_")
    const isTestKey = stripeKey.startsWith("sk_test_")
    const expectedSessionPrefix = isLiveKey ? "cs_live_" : "cs_test_"

    // Check if session ID matches expected type
    const sessionMatches = sessionId.startsWith(expectedSessionPrefix)

    if (!sessionMatches) {
      return NextResponse.json({
        error: "Session type mismatch",
        details: `Using ${isLiveKey ? "live" : "test"} keys but session ID starts with ${sessionId.substring(0, 8)}`,
        recommendation: `Expected session ID to start with ${expectedSessionPrefix}`,
        environment: {
          keyType: isLiveKey ? "live" : "test",
          keyPrefix: stripeKey.substring(0, 8),
          expectedSessionType: expectedSessionPrefix,
          actualSessionType: sessionId.substring(0, 8),
        },
        configurationSteps: [
          isLiveKey
            ? "Use live session IDs (cs_live_...) with live keys"
            : "Use test session IDs (cs_test_...) with test keys",
          "Or switch to the appropriate Stripe key for your session type",
          "Check your Stripe dashboard to verify session creation",
        ],
      })
    }

    try {
      // Attempt to retrieve the session
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      // Analyze the session
      const analysis = {
        isExpired: session.expires_at * 1000 < Date.now(),
        isPaid: session.payment_status === "paid",
        isComplete: session.status === "complete",
        hasMetadata: Object.keys(session.metadata || {}).length > 0,
      }

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          status: session.status,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
          customer_email: session.customer_details?.email,
          created: session.created * 1000,
          expires_at: session.expires_at * 1000,
          metadata: session.metadata,
          url: session.url,
        },
        analysis,
        environment: {
          keyType: isLiveKey ? "live" : "test",
          keyPrefix: stripeKey.substring(0, 8),
          sessionType: sessionId.substring(0, 8),
        },
      })
    } catch (stripeError: any) {
      if (stripeError.code === "resource_missing") {
        return NextResponse.json({
          error: "Session not found",
          details: "The session ID does not exist in your Stripe account",
          recommendation: "Verify the session ID is correct and belongs to your Stripe account",
          possibleCauses: [
            "Session ID is incorrect or incomplete",
            "Session belongs to a different Stripe account",
            "Session has expired (sessions expire after 24 hours)",
            "Session was created in a different mode (test vs live)",
          ],
          environment: {
            keyType: isLiveKey ? "live" : "test",
            keyPrefix: stripeKey.substring(0, 8),
            sessionType: sessionId.substring(0, 8),
          },
        })
      }

      throw stripeError
    }
  } catch (error: any) {
    console.error("Stripe session debug error:", error)

    return NextResponse.json(
      {
        error: "Failed to debug session",
        details: error.message,
        type: error.type || "unknown_error",
      },
      { status: 500 },
    )
  }
}
