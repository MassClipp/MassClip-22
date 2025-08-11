import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import {
  processCheckoutSessionCompleted,
  processSubscriptionUpdated,
  processSubscriptionDeleted,
} from "@/lib/stripe/webhook-processor"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const buf = await req.text()
  const sig = headers().get("Stripe-Signature")!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
  } catch (err) {
    const errorMessage = `❌ Webhook signature verification failed: ${err instanceof Error ? err.message : "Unknown error"}`
    console.error(errorMessage)
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 })
  }

  console.log(`Received Stripe event: ${event.type}`)

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
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    const errorMessage = `❌ Error processing webhook ${event.type}: ${error instanceof Error ? error.message : "Unknown error"}`
    console.error(errorMessage)
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 })
  }
}
