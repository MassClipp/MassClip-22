import Stripe from "stripe"
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import {
  processCheckoutSessionCompleted,
  processSubscriptionUpdated,
  processSubscriptionDeleted,
  processPaymentIntentSucceeded,
} from "@/lib/stripe/webhook-processor"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get("Stripe-Signature") as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`🔔 [Webhook] Received event: ${event.type}`)

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
        console.log(`[Webhook] Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error("[Webhook] Error processing event:", error)
    return new NextResponse("Webhook handler failed. See logs.", { status: 500 })
  }

  return NextResponse.json({ received: true })
}
