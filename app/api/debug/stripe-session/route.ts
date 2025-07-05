import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    console.log("🔍 [Debug] Retrieving Stripe session:", sessionId)

    // Retrieve the Stripe session with all details
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items", "line_items.data.price.product"],
    })

    // Get line items separately for more details
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      expand: ["data.price.product"],
    })

    const debugInfo = {
      session: {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_details?.email,
        metadata: session.metadata,
        created: new Date(session.created * 1000).toISOString(),
        expires_at: new Date(session.expires_at * 1000).toISOString(),
        payment_intent: session.payment_intent,
        mode: session.mode,
        success_url: session.success_url,
        cancel_url: session.cancel_url,
      },
      lineItems: lineItems.data.map((item) => ({
        id: item.id,
        amount_total: item.amount_total,
        currency: item.currency,
        description: item.description,
        quantity: item.quantity,
        price: {
          id: item.price?.id,
          unit_amount: item.price?.unit_amount,
          currency: item.price?.currency,
          product: item.price?.product,
        },
      })),
      environment: {
        stripeKeyExists: !!process.env.STRIPE_SECRET_KEY,
        stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
      },
    }

    console.log("✅ [Debug] Session retrieved successfully")
    return NextResponse.json(debugInfo)
  } catch (error: any) {
    console.error("❌ [Debug] Error retrieving session:", error)

    return NextResponse.json(
      {
        error: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        requestId: error.requestId,
      },
      { status: error.statusCode || 500 },
    )
  }
}
