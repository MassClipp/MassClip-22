import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      console.error("❌ [Webhook] No Stripe signature found")
      return NextResponse.json({ error: "No signature provided" }, { status: 400 })
    }

    // Determine which webhook secret to use based on the Stripe key being used
    const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
    const webhookSecret = isTestMode ? process.env.STRIPE_WEBHOOK_SECRET_TEST : process.env.STRIPE_WEBHOOK_SECRET_LIVE

    if (!webhookSecret) {
      const missingSecret = isTestMode ? "STRIPE_WEBHOOK_SECRET_TEST" : "STRIPE_WEBHOOK_SECRET_LIVE"
      console.error(`❌ [Webhook] Missing ${missingSecret} environment variable`)
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    console.log(`🔍 [Webhook] Processing ${isTestMode ? "TEST" : "LIVE"} mode webhook`)

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(`✅ [Webhook] Signature verified for ${isTestMode ? "TEST" : "LIVE"} mode`)
    } catch (err) {
      console.error(`❌ [Webhook] Signature verification failed:`, err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log(`🎉 [Webhook] ${isTestMode ? "TEST" : "LIVE"} Checkout session completed:`, {
        sessionId: session.id,
        customerId: session.customer,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total,
        currency: session.currency,
        paymentStatus: session.payment_status,
        metadata: session.metadata,
        mode: session.mode,
      })

      // TODO: Add your business logic here
      // - Update database with purchase record
      // - Grant access to purchased content
      // - Send confirmation email
      // - Update user subscription status

      return NextResponse.json({
        received: true,
        mode: isTestMode ? "test" : "live",
        sessionId: session.id,
      })
    }

    // Log other events but don't process them
    console.log(`ℹ️ [Webhook] ${isTestMode ? "TEST" : "LIVE"} Received unhandled event type: ${event.type}`)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Webhook] Error processing webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
