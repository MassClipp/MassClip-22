import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Debug Session API] Starting session debug")

    const { sessionId } = await request.json()

    console.log("📋 [Debug Session API] Request details:", {
      sessionId: sessionId?.substring(0, 20) + "...",
      sessionType: sessionId?.startsWith("cs_test_") ? "test" : "live",
    })

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    // Check Stripe configuration
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return NextResponse.json({ error: "Missing Stripe configuration" }, { status: 500 })
    }

    const keyType = stripeKey.startsWith("sk_test_") ? "test" : "live"
    const sessionType = sessionId.startsWith("cs_test_") ? "test" : "live"

    console.log("🔑 [Debug Session API] Configuration check:", {
      keyType,
      sessionType,
      matches: keyType === sessionType,
    })

    // Check for test/live mismatch
    if (keyType !== sessionType) {
      return NextResponse.json({
        error: "Test/Live Mode Mismatch",
        keyType,
        sessionType,
        recommendation: `Your Stripe key is ${keyType} but the session is ${sessionType}. Update your STRIPE_SECRET_KEY to match.`,
        environment: {
          STRIPE_SECRET_KEY: stripeKey.substring(0, 10) + "...",
          keyType,
          sessionType,
        },
      })
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-08-16" })

    try {
      console.log("📡 [Debug Session API] Retrieving session from Stripe...")
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      console.log("✅ [Debug Session API] Session found:", {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        created: new Date(session.created * 1000),
        expires_at: session.expires_at ? new Date(session.expires_at * 1000) : null,
      })

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          status: session.status,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
          created: new Date(session.created * 1000),
          expires_at: session.expires_at ? new Date(session.expires_at * 1000) : null,
          metadata: session.metadata,
        },
        environment: {
          keyType,
          sessionType,
        },
      })
    } catch (stripeError: any) {
      console.error("❌ [Debug Session API] Stripe error:", stripeError)

      if (stripeError.statusCode === 404) {
        return NextResponse.json({
          error: "Session not found in Stripe",
          details: "This session ID does not exist in your Stripe account",
          sessionId: sessionId.substring(0, 20) + "...",
          stripeError: {
            type: stripeError.type,
            code: stripeError.code,
            message: stripeError.message,
          },
          environment: {
            keyType,
            sessionType,
          },
          recommendation: `Check if this session exists in your Stripe ${keyType} dashboard`,
        })
      }

      return NextResponse.json({
        error: "Stripe API error",
        details: stripeError.message,
        stripeError: {
          type: stripeError.type,
          code: stripeError.code,
          statusCode: stripeError.statusCode,
        },
        environment: {
          keyType,
          sessionType,
        },
      })
    }
  } catch (error) {
    console.error("❌ [Debug Session API] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Debug failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
