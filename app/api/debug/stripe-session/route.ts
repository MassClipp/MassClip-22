import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Determine expected session type based on our Stripe key
    const stripeKey = process.env.STRIPE_SECRET_KEY!
    const isLiveKey = stripeKey.startsWith("sk_live_")
    const isTestKey = stripeKey.startsWith("sk_test_")
    const sessionIsLive = sessionId.startsWith("cs_live_")
    const sessionIsTest = sessionId.startsWith("cs_test_")

    // Check for mode mismatch before making API call
    if (isLiveKey && sessionIsTest) {
      return NextResponse.json(
        {
          error: "Mode Mismatch: Live key cannot access test session",
          details: `Your Stripe key (${stripeKey.substring(0, 8)}...) is a live key, but you're trying to access a test session (${sessionId.substring(0, 8)}...)`,
          recommendation:
            "Use a test key (sk_test_...) to access test sessions, or use a live session ID (cs_live_...) with your live key",
          configurationSteps: [
            "1. Check your STRIPE_SECRET_KEY environment variable",
            "2. Ensure it matches the session type you want to access",
            "3. For testing: use sk_test_... keys with cs_test_... sessions",
            "4. For production: use sk_live_... keys with cs_live_... sessions",
          ],
        },
        { status: 400 },
      )
    }

    if (isTestKey && sessionIsLive) {
      return NextResponse.json(
        {
          error: "Mode Mismatch: Test key cannot access live session",
          details: `Your Stripe key (${stripeKey.substring(0, 8)}...) is a test key, but you're trying to access a live session (${sessionId.substring(0, 8)}...)`,
          recommendation:
            "Use a live key (sk_live_...) to access live sessions, or use a test session ID (cs_test_...) with your test key",
          configurationSteps: [
            "1. Check your STRIPE_SECRET_KEY environment variable",
            "2. Ensure it matches the session type you want to access",
            "3. For testing: use sk_test_... keys with cs_test_... sessions",
            "4. For production: use sk_live_... keys with cs_live_... sessions",
          ],
        },
        { status: 400 },
      )
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
        createdHoursAgo: Math.floor((Date.now() - session.created * 1000) / (1000 * 60 * 60)),
      }

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
          expires_at: session.expires_at * 1000, // Convert to milliseconds
          metadata: session.metadata,
          mode: session.mode,
        },
        analysis,
        environment: {
          stripeKeyType: isLiveKey ? "live" : isTestKey ? "test" : "unknown",
          sessionType: sessionIsLive ? "live" : sessionIsTest ? "test" : "unknown",
          modesMatch: (isLiveKey && sessionIsLive) || (isTestKey && sessionIsTest),
        },
      })
    } catch (stripeError: any) {
      // Handle specific Stripe errors
      if (stripeError.code === "resource_missing") {
        return NextResponse.json(
          {
            error: "Session Not Found",
            details: `The session ${sessionId} was not found in your Stripe account`,
            recommendation: "Verify the session ID is correct and belongs to the correct Stripe account",
            configurationSteps: [
              "1. Double-check the session ID is complete and correct",
              "2. Ensure the session belongs to the same Stripe account as your API key",
              "3. Check if the session has expired (sessions expire after 24 hours)",
              "4. Verify you're using the correct test/live mode",
            ],
            stripeError: {
              code: stripeError.code,
              message: stripeError.message,
              type: stripeError.type,
            },
          },
          { status: 404 },
        )
      }

      // Handle other Stripe errors
      return NextResponse.json(
        {
          error: "Stripe API Error",
          details: stripeError.message,
          recommendation: "Check your Stripe configuration and API key permissions",
          stripeError: {
            code: stripeError.code,
            message: stripeError.message,
            type: stripeError.type,
          },
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Error debugging Stripe session:", error)
    return NextResponse.json({ error: "Internal server error while debugging session" }, { status: 500 })
  }
}
