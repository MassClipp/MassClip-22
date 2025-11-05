import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        {
          error: "Session ID is required",
          code: "MISSING_SESSION_ID",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 [Session Debug] Debugging session: ${sessionId}`)

    // Determine expected session type based on current Stripe key
    const vercelEnv = process.env.VERCEL_ENV || "development"
    const isProduction = vercelEnv === "production"
    const activeKey = isProduction
      ? process.env.STRIPE_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY

    const keyType = activeKey?.startsWith("sk_live_") ? "live" : "test"
    const sessionType = sessionId.startsWith("cs_live_") ? "live" : "test"

    // Check for mode mismatch before making API call
    if (keyType !== sessionType) {
      return NextResponse.json(
        {
          error: "Test/Live mode mismatch detected",
          details: `You're using ${keyType} keys but trying to access a ${sessionType} session`,
          recommendation: `Use ${keyType === "live" ? "cs_live_" : "cs_test_"}... session IDs with your current configuration`,
          configurationSteps: [
            `Current environment: ${vercelEnv}`,
            `Active key type: ${keyType}`,
            `Session type: ${sessionType}`,
            keyType === "live"
              ? "Switch to test keys for preview environments or use live session IDs"
              : "Use test session IDs (cs_test_...) with test keys",
          ],
          environment: {
            vercelEnv,
            keyType,
            sessionType,
            mismatch: true,
          },
        },
        { status: 400 },
      )
    }

    try {
      // Retrieve the session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      console.log(`✅ [Session Debug] Session retrieved successfully`)

      // Analyze the session
      const now = new Date()
      const expiresAt = new Date(session.expires_at * 1000)
      const createdAt = new Date(session.created * 1000)

      const analysis = {
        isExpired: now > expiresAt,
        isPaid: session.payment_status === "paid",
        isComplete: session.status === "complete",
        hasMetadata: Object.keys(session.metadata || {}).length > 0,
        timeUntilExpiry: expiresAt.getTime() - now.getTime(),
        ageInHours: (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60),
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
          created: session.created,
          expires_at: session.expires_at,
          metadata: session.metadata,
          url: session.url,
        },
        analysis,
        environment: {
          vercelEnv,
          keyType,
          sessionType,
          mismatch: false,
        },
      })
    } catch (stripeError: any) {
      console.error(`❌ [Session Debug] Stripe API error:`, stripeError)

      // Handle specific Stripe errors
      if (stripeError.code === "resource_missing") {
        return NextResponse.json(
          {
            error: "Session not found",
            details: "The session ID does not exist in your Stripe account",
            recommendation: "Verify the session ID is correct and belongs to your Stripe account",
            configurationSteps: [
              "Check if the session ID is complete and correct",
              "Verify the session was created in the same Stripe account",
              "Ensure the session hasn't expired (24-hour limit)",
              `Make sure you're using ${keyType} session IDs with ${keyType} keys`,
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

      return NextResponse.json(
        {
          error: "Stripe API error",
          details: stripeError.message,
          stripeError: {
            code: stripeError.code,
            message: stripeError.message,
            type: stripeError.type,
          },
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error(`❌ [Session Debug] Unexpected error:`, error)
    return NextResponse.json(
      {
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
