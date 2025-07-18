import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

async function getSessionId(request: NextRequest): Promise<string | null> {
  const { searchParams } = new URL(request.url)
  return searchParams.get("sessionId")
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = await getSessionId(request)

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log(`🔄 [Convert Session] Converting session to payment intent: ${sessionId}`)

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    })

    const paymentIntent = session.payment_intent as Stripe.PaymentIntent

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    })
  } catch (error) {
    console.error("❌ [Convert Session] Error:", error)
    return NextResponse.json({ error: "Failed to convert session" }, { status: 500 })
  }
}
