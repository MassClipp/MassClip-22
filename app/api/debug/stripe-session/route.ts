import { type NextRequest, NextResponse } from "next/server"
import { getStripeClientForSession, getStripeDebugInfo } from "@/lib/stripe-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Get debug information
    const debugInfo = getStripeDebugInfo(sessionId)

    try {
      // Get the appropriate Stripe client
      const stripeConfig = getStripeClientForSession(sessionId)

      // Try to retrieve the session
      const session = await stripeConfig.client.checkout.sessions.retrieve(sessionId)

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          payment_status: session.payment_status,
          status: session.status,
          amount_total: session.amount_total,
          currency: session.currency,
          metadata: session.metadata,
        },
        stripeConfig: {
          mode: stripeConfig.mode,
          keyPrefix: stripeConfig.keyPrefix,
        },
        debugInfo,
        recommendation: "Session retrieved successfully with correct Stripe configuration",
      })
    } catch (stripeError: any) {
      return NextResponse.json(
        {
          error: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          statusCode: stripeError.statusCode,
          debugInfo,
          recommendation:
            stripeError.statusCode === 404
              ? "Session not found. Verify the session ID and ensure it belongs to your Stripe account."
              : "Check your Stripe configuration and API keys.",
        },
        { status: stripeError.statusCode || 500 },
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        debugInfo: getStripeDebugInfo(),
        recommendation: "Check your environment variables and Stripe configuration",
      },
      { status: 500 },
    )
  }
}
