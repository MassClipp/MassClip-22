import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Session ID is required",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 [Session Debug] Debugging session: ${sessionId}`)

    // Determine expected session type based on current Stripe key
    const vercelEnv = process.env.VERCEL_ENV || "development"
    const isProduction = vercelEnv === "production"

    let stripeKey: string | undefined
    if (isProduction) {
      stripeKey = process.env.STRIPE_SECRET_KEY
    } else {
      stripeKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
    }

    const keyType = stripeKey?.startsWith("sk_live_") ? "live" : "test"
    const sessionType = sessionId.startsWith("cs_live_") ? "live" : "test"

    // Check for mode mismatch
    if (keyType !== sessionType) {
      return NextResponse.json({
        success: false,
        error: "Mode mismatch detected",
        details: {
          sessionId,
          sessionType,
          keyType,
          mismatch: true,
          recommendation: `Use ${keyType === "live" ? "cs_live_" : "cs_test_"}... sessions with your current ${keyType} keys`,
        },
      })
    }

    try {
      // Attempt to retrieve the session
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          status: session.status,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
          created: new Date(session.created * 1000).toISOString(),
          expires_at: new Date(session.expires_at * 1000).toISOString(),
          mode: session.mode,
          metadata: session.metadata,
        },
        keyType,
        sessionType,
      })
    } catch (stripeError: any) {
      console.error(`❌ [Session Debug] Stripe error:`, stripeError)

      let errorType = "unknown"
      let recommendation = "Check your session ID and try again"

      if (stripeError.code === "resource_missing") {
        errorType = "session_not_found"
        recommendation = "This session doesn't exist or has expired (24 hour limit)"
      } else if (stripeError.code === "invalid_request_error") {
        errorType = "invalid_session_id"
        recommendation = "Check that your session ID is correctly formatted"
      }

      return NextResponse.json({
        success: false,
        error: "Stripe API error",
        details: {
          sessionId,
          stripeError: stripeError.message,
          stripeCode: stripeError.code,
          errorType,
          recommendation,
          keyType,
          sessionType,
          mismatch: keyType !== sessionType,
        },
      })
    }
  } catch (error: any) {
    console.error(`❌ [Session Debug] Unexpected error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST method to debug a session",
    usage: {
      method: "POST",
      body: {
        sessionId: "cs_test_... or cs_live_...",
      },
    },
  })
}
