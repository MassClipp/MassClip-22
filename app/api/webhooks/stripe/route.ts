import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error(`❌ [Stripe Webhook] Webhook signature verification failed:`, err.message)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log(`🔔 [Stripe Webhook] Received event: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      default:
        console.log(`🔔 [Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error(`❌ [Stripe Webhook] Error processing webhook:`, error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log(`✅ [Stripe Webhook] Processing checkout session completed: ${session.id}`)

    const { customer_details, metadata, amount_total, currency } = session

    if (!metadata?.bundleId || !metadata?.userId) {
      console.error(`❌ [Stripe Webhook] Missing required metadata in session: ${session.id}`)
      return
    }

    const purchaseData = {
      id: session.id,
      sessionId: session.id,
      stripeSessionId: session.id,
      paymentIntentId: session.payment_intent as string,
      bundleId: metadata.bundleId,
      userId: metadata.userId,
      amount: (amount_total || 0) / 100, // Convert from cents
      currency: currency || "usd",
      status: "complete",
      customerEmail: customer_details?.email || "",
      webhookProcessedAt: new Date().toISOString(),
      webhookEventId: `evt_${Date.now()}`,
      createdAt: new Date().toISOString(),
      metadata: metadata,
    }

    // Store purchase in multiple locations
    const batch = db.batch()

    // 1. User's purchases subcollection
    const userPurchaseRef = db.collection("users").doc(metadata.userId).collection("purchases").doc(session.id)
    batch.set(userPurchaseRef, purchaseData)

    // 2. Unified purchases collection
    const unifiedPurchaseRef = db
      .collection("userPurchases")
      .doc(metadata.userId)
      .collection("purchases")
      .doc(session.id)
    batch.set(unifiedPurchaseRef, purchaseData)

    await batch.commit()

    console.log(`✅ [Stripe Webhook] Purchase recorded successfully for session: ${session.id}`)
  } catch (error: any) {
    console.error(`❌ [Stripe Webhook] Error handling checkout session completed:`, error)
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`✅ [Stripe Webhook] Processing payment intent succeeded: ${paymentIntent.id}`)

    // Update payment intent status if needed
    // This is mainly for logging and additional processing

    console.log(`✅ [Stripe Webhook] Payment intent processed: ${paymentIntent.id}`)
  } catch (error: any) {
    console.error(`❌ [Stripe Webhook] Error handling payment intent succeeded:`, error)
  }
}
