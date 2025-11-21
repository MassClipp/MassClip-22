import { NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { processContentPackPurchase } from "@/lib/stripe/webhook-processor"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = process.env.WEBHOOK_SECRET_KEY_3 || process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  const sig = headers().get("stripe-signature") || headers().get("Stripe-Signature")
  const body = await request.text()

  if (!sig) {
    console.error("❌ [Content Pack WH-5] Missing signature")
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error(`❌ [Content Pack WH-5] Signature verification failed: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`\n========== CONTENT PACK WEBHOOK-5 ==========`)
  console.log(`[v0] 📦 Event Type: ${event.type}`)
  console.log(`[v0] 🆔 Event ID: ${event.id}`)
  console.log(`[v0] ⏰ Timestamp: ${new Date().toISOString()}`)
  console.log(`==========================================\n`)

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`[v0] 📦 Processing content pack purchase: ${session.id}`)
        console.log(`[v0] 👤 Customer: ${session.customer_details?.email}`)
        console.log(`[v0] 💰 Amount: $${session.amount_total ? session.amount_total / 100 : 0}`)

        await processContentPackPurchase(session)

        console.log(`[v0] ✅ Content pack purchase processed successfully`)
        break

      default:
        console.log(`[v0] ℹ️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true, processed: true })
  } catch (error: any) {
    console.error(`\n========== CONTENT PACK WEBHOOK ERROR ==========`)
    console.error(`[v0] ❌ Event type: ${event.type}`)
    console.error(`[v0] ❌ Error: ${error.message}`)
    console.error(`[v0] ❌ Stack: ${error.stack}`)
    console.error(`==========================================\n`)
    return NextResponse.json({ error: "Webhook handler failed", details: error.message }, { status: 500 })
  }
}
