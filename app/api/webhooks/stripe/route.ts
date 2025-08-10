import Stripe from "stripe"
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import type { Request } from "next/dist/server/web/types"

import {
  processCheckoutSessionCompleted,
  processPaymentIntentSucceeded,
  processSubscriptionUpdated,
  processSubscriptionDeleted,
} from "@/lib/stripe/webhook-processor"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
})

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get("Stripe-Signature") as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

  let event: Stripe.Event

  try {
    if (!signature || !webhookSecret) {
      console.error("Stripe webhook error: Missing signature or secret")
      return new NextResponse("Webhook Error: Missing signature or secret", { status: 400 })
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`🔔 Received Stripe event: ${event.type}`)

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
        console.log(`🤷‍♀️ Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error(`Webhook handler error for event ${event.type}:`, error)
    return new NextResponse("Webhook handler error", { status: 500 })
  }

  return new NextResponse(null, { status: 200 })
}
