import Stripe from "stripe"
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import {
  processCheckoutSessionCompleted,
  processSubscriptionUpdated,
  processSubscriptionDeleted,
  processPaymentIntentSucceeded,
} from "@/lib/stripe/webhook-processor"

// This check is important. If the secret is missing, we can't verify webhooks.
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET environment variable not set")
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get("Stripe-Signature") as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`🔔 [Webhook] Received event: ${event.type} (${event.id})`)

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await processCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "customer.subscription.updated":
      case "customer.subscription.created":
        await processSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case "customer.subscription.deleted":
        await processSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case "payment_intent.succeeded":
        await processPaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      default:
        console.log(`🤷‍♀️ Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error(`Webhook handler error for event ${event.type}:`, error)
    return new NextResponse("Webhook handler failed. See server logs for details.", { status: 500 })
  }

  return NextResponse.json({ received: true })
}
