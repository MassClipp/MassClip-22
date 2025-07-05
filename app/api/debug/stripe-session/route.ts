import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        {
          error: "Session ID is required",
          code: "MISSING_SESSION_ID",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 [Session Debug] Attempting to retrieve session: ${sessionId}`)

    // Check if session ID format matches key type
    const keyPrefix = process.env.STRIPE_SECRET_KEY?.substring(0, 7) || "unknown"
    const expectedSessionPrefix = keyPrefix.includes("test") ? "cs_test_" : "cs_live_"
    const actualSessionPrefix = sessionId.substring(0, 8)

    const mismatchDetected = !sessionId.startsWith(expectedSessionPrefix)

    if (mismatchDetected) {
      return NextResponse.json({
        success: false,
        error: "Mode Mismatch Detected",
        code: "MODE_MISMATCH",
        details: {
          sessionId,
          keyType: keyPrefix,
          expectedSessionPrefix,
          actualSessionPrefix,
          recommendation: keyPrefix.includes("test")
            ? "Use a test session ID (cs_test_...) with test keys"
            : "Use a live session ID (cs_live_...) with live keys",
        },
      })
    }

    // Attempt to retrieve the session
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    console.log(`✅ [Session Debug] Session retrieved successfully`)

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_details?.email,
        created: new Date(session.created * 1000).toISOString(),
        expires_at: new Date(session.expires_at * 1000).toISOString(),
        mode: session.mode,
        metadata: session.metadata,
      },
      raw: session,
    })
  } catch (error: any) {
    console.error(`❌ [Session Debug] Error:`, error)

    // Handle specific Stripe errors
    if (error.type === "StripeInvalidRequestError") {
      if (error.code === "resource_missing") {
        return NextResponse.json({
          success: false,
          error: "Session Not Found",
          code: "SESSION_NOT_FOUND",
          details: {
            message: "The session ID does not exist or has expired",
            possibleCauses: [
              "Session ID is incorrect",
              "Session has expired (24 hour limit)",
              "Session was created in a different Stripe account",
              "Mode mismatch (test vs live)",
            ],
            recommendations: [
              "Verify the session ID is correct",
              "Check if the session was created recently",
              "Ensure you're using the correct Stripe account",
              "Match session type with your API key mode",
            ],
          },
          stripeError: {
            type: error.type,
            code: error.code,
            message: error.message,
          },
        })
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Session Debug Failed",
        code: "DEBUG_FAILED",
        details: error.message,
        stripeError: {
          type: error.type,
          code: error.code,
          message: error.message,
        },
      },
      { status: 500 },
    )
  }
}
