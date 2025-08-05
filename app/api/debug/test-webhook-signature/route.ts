import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "STRIPE_WEBHOOK_SECRET not configured",
        },
        { status: 500 },
      )
    }

    // Create a test payload
    const testPayload = JSON.stringify({
      id: "evt_test_webhook",
      object: "event",
      api_version: "2024-06-20",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: "cs_test_session",
          object: "checkout.session",
          amount_total: 2000,
          currency: "usd",
          payment_status: "paid",
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: null,
        idempotency_key: null,
      },
      type: "checkout.session.completed",
    })

    // Generate a test signature
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: testPayload,
      secret: webhookSecret,
      timestamp,
    })

    console.log("🔐 [Signature Test] Generated test signature:", {
      payloadLength: testPayload.length,
      signatureLength: signature.length,
      timestamp,
    })

    // Try to verify the signature
    try {
      const event = stripe.webhooks.constructEvent(testPayload, signature, webhookSecret)

      return NextResponse.json({
        success: true,
        message: "Webhook signature verification working correctly",
        eventType: event.type,
        eventId: event.id,
        signatureLength: signature.length,
        payloadLength: testPayload.length,
      })
    } catch (signatureError: any) {
      return NextResponse.json(
        {
          success: false,
          error: "Signature verification failed",
          details: signatureError.message,
          signatureLength: signature.length,
          payloadLength: testPayload.length,
        },
        { status: 400 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Signature Test] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
