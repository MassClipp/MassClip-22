import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    console.log("🔍 [Debug] Retrieving session:", sessionId)

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    })

    console.log("📊 [Debug] Session details:", {
      id: session.id,
      payment_status: session.payment_status,
      metadata: session.metadata,
      client_reference_id: session.client_reference_id,
      amount_total: session.amount_total,
      currency: session.currency,
    })

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        metadata: session.metadata,
        client_reference_id: session.client_reference_id,
        amount_total: session.amount_total,
        currency: session.currency,
        created: session.created,
        url: session.url,
      },
    })
  } catch (error) {
    console.error("❌ [Debug] Error retrieving session:", error)
    return NextResponse.json(
      {
        error: "Failed to retrieve session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
