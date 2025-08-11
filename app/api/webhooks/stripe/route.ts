import Stripe from "stripe"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("Stripe webhook secret is not set.")
    return new NextResponse("Webhook secret not configured", { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await processCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "customer.subscription.updated":
        await processSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case "customer.subscription.deleted":
        await processSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case "payment_intent.succeeded":
        await processPaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }
    return new NextResponse(JSON.stringify({ received: true }), { status: 200 })
  } catch (error: any) {
    console.error("Error processing webhook:", error)
    return new NextResponse(`Webhook handler failed: ${error.message}`, { status: 500 })
  }
}
