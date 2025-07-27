import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("🔍 [Session Lookup] Looking up session:", sessionId)
    console.log("   Current Stripe mode:", process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "LIVE" : "TEST")

    const lookupResult = {
      sessionId,
      found: false,
      details: null as any,
      error: null as any,
      analysis: {
        sessionPrefix: sessionId.substring(0, 8),
        isLiveSession: sessionId.startsWith("cs_live_"),
        isTestSession: sessionId.startsWith("cs_test_"),
        currentApiMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
        modeMatch: null as boolean | null,
        stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) || "not_set",
      },
    }

    // Calculate mode match
    lookupResult.analysis.modeMatch =
      (lookupResult.analysis.isLiveSession && lookupResult.analysis.currentApiMode === "live") ||
      (lookupResult.analysis.isTestSession && lookupResult.analysis.currentApiMode === "test")

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      lookupResult.found = true
      lookupResult.details = {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        created: new Date(session.created * 1000).toISOString(),
        expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        metadata: session.metadata,
        mode: session.mode,
        customer_email: session.customer_details?.email,
        payment_intent: session.payment_intent,
      }

      console.log("✅ [Session Lookup] Session found:", {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
      })
    } catch (error: any) {
      lookupResult.error = {
        type: error.type,
        message: error.message,
        code: error.code,
      }

      console.log("❌ [Session Lookup] Session not found:", error.message)
    }

    return NextResponse.json(lookupResult)
  } catch (error: any) {
    console.error("❌ [Session Lookup] Lookup failed:", error)
    return NextResponse.json(
      {
        error: "Session lookup failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
