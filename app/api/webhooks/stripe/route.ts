import { NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { adminDb } from "@/lib/firebase-admin"
import {
  processCheckoutSessionCompleted,
  processSubscriptionDeleted,
  processSubscriptionUpdated,
} from "@/lib/stripe/webhook-processor"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  const sig = headers().get("stripe-signature") || headers().get("Stripe-Signature")
  const body = await request.text()

  if (!sig || !webhookSecret) {
    console.error("Webhook Error: Missing signature or secret.")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    // Test Firebase connection with a simple operation
    await adminDb.collection("_test").limit(1).get()
  } catch (error) {
    console.error("❌ Firebase not accessible in webhook:", error)
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 })
  }

  // Store raw event for diagnostics (non-blocking)
  adminDb
    .collection("stripeEvents")
    .add({
      id: event.id,
      type: event.type,
      object: event.object,
      api_version: event.api_version,
      data: event.data,
      created: new Date(event.created * 1000),
    })
    .catch((error) => {
      console.error("Failed to store raw stripe event", error)
    })

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
        console.log(`Unhandled event type ${event.type}`)
    }
  } catch (error: any) {
    console.error(`Webhook handler failed for event ${event.type}.`, error)
    return NextResponse.json({ error: "Webhook handler failed", details: error.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
