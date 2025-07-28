import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Debug Stripe Lookup] Starting direct Stripe session lookup...")

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("🔍 [Debug Stripe Lookup] Session ID:", sessionId)
    console.log(
      "🔍 [Debug Stripe Lookup] Stripe key type:",
      process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "LIVE" : "TEST",
    )
    console.log("🔍 [Debug Stripe Lookup] Environment:", process.env.NODE_ENV)

    // Direct Stripe lookup - no auth, no Firebase, just Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
    })

    console.log("✅ [Debug Stripe Lookup] Session found!")
    console.log("   ID:", session.id)
    console.log("   Status:", session.status)
    console.log("   Payment Status:", session.payment_status)
    console.log("   Mode:", session.mode)
    console.log("   Amount:", session.amount_total)
    console.log("   Created:", new Date(session.created * 1000))
    console.log("   Expires:", new Date(session.expires_at * 1000))

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        mode: session.mode,
        amount_total: session.amount_total,
        currency: session.currency,
        created: session.created,
        expires_at: session.expires_at,
        customer_details: session.customer_details,
        metadata: session.metadata,
      },
      environment: {
        stripeKeyType: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
        nodeEnv: process.env.NODE_ENV,
      },
    })
  } catch (error: any) {
    console.error("❌ [Debug Stripe Lookup] Error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code,
        sessionId: request.body,
        environment: {
          stripeKeyType: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
          nodeEnv: process.env.NODE_ENV,
        },
      },
      { status: 500 },
    )
  }
}
