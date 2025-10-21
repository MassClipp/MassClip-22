import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import {
  processCheckoutSessionCompleted,
  processSubscriptionUpdated,
  processSubscriptionDeleted,
  processPaymentIntentSucceeded,
} from "@/lib/stripe/webhook-processor"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  console.log("🔔 [Webhook-4] ========== NEW WEBHOOK EVENT RECEIVED ==========")

  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    console.error("❌ [Webhook-4] Missing Stripe signature header")
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  const webhookSecret = process.env.STARTER_PLAN_WH || process.env.STRIPE_WEBHOOK_SECRET
  console.log(`🔐 [Webhook-4] Using webhook secret: ${webhookSecret ? "FOUND" : "MISSING"}`)
  console.log(`🔐 [Webhook-4] Secret starts with: ${webhookSecret?.substring(0, 10)}...`)

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret!)
    console.log(`✅ [Webhook-4] Event verified successfully: ${event.type}`)
  } catch (err: any) {
    console.error(`❌ [Webhook-4] Webhook signature verification failed:`, err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  console.log(`📋 [Webhook-4] Event Type: ${event.type}`)
  console.log(`📋 [Webhook-4] Event ID: ${event.id}`)

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`💳 [Webhook-4] Checkout Session Completed`)
        console.log(`   - Session ID: ${session.id}`)
        console.log(`   - Customer: ${session.customer}`)
        console.log(`   - Subscription: ${session.subscription}`)
        console.log(`   - Metadata:`, JSON.stringify(session.metadata, null, 2))
        console.log(`   - Plan from metadata: ${session.metadata?.plan || "NOT SET"}`)

        if (session.mode === "subscription") {
          console.log(`🔄 [Webhook-4] Processing subscription checkout...`)
          await processCheckoutSessionCompleted(session)
          console.log(`✅ [Webhook-4] Subscription checkout processed successfully`)
        } else {
          console.log(`ℹ️ [Webhook-4] Skipping non-subscription checkout`)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`🔄 [Webhook-4] Subscription Updated`)
        console.log(`   - Subscription ID: ${subscription.id}`)
        console.log(`   - Customer: ${subscription.customer}`)
        console.log(`   - Status: ${subscription.status}`)
        console.log(`   - Price ID: ${subscription.items.data[0]?.price.id}`)
        console.log(`   - Metadata:`, JSON.stringify(subscription.metadata, null, 2))

        await processSubscriptionUpdated(subscription)
        console.log(`✅ [Webhook-4] Subscription update processed successfully`)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`🗑️ [Webhook-4] Subscription Deleted`)
        console.log(`   - Subscription ID: ${subscription.id}`)
        console.log(`   - Customer: ${subscription.customer}`)

        await processSubscriptionDeleted(subscription)
        console.log(`✅ [Webhook-4] Subscription deletion processed successfully`)
        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`💰 [Webhook-4] Payment Intent Succeeded`)
        console.log(`   - Payment Intent ID: ${paymentIntent.id}`)
        console.log(`   - Amount: ${paymentIntent.amount}`)
        console.log(`   - Metadata:`, JSON.stringify(paymentIntent.metadata, null, 2))

        if (paymentIntent.metadata.productType) {
          await processPaymentIntentSucceeded(paymentIntent)
          console.log(`✅ [Webhook-4] Payment intent processed successfully`)
        } else {
          console.log(`ℹ️ [Webhook-4] Skipping payment intent without productType metadata`)
        }
        break
      }

      default:
        console.log(`ℹ️ [Webhook-4] Unhandled event type: ${event.type}`)
    }

    console.log(`✅ [Webhook-4] ========== WEBHOOK EVENT COMPLETED ==========`)
    return NextResponse.json({ received: true, eventType: event.type })
  } catch (error: any) {
    console.error(`❌ [Webhook-4] Error processing webhook:`, error)
    console.error(`   - Error message: ${error.message}`)
    console.error(`   - Error stack:`, error.stack)
    return NextResponse.json({ error: "Webhook handler failed", details: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Starter Plan Webhook Endpoint",
    endpoint: "/api/webhook-handler-4",
    methods: ["POST"],
    status: "active",
  })
}
