import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { processCheckoutSessionCompleted } from "@/lib/stripe/webhook-processor"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  console.log("🎣 Webhook received")
  
  try {
    const body = await request.text()
    const headersList = headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      console.error("❌ No Stripe signature found")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    if (!webhookSecret) {
      console.error("❌ No webhook secret configured")
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(`✅ Webhook signature verified for event: ${event.type}`)
    } catch (err: any) {
      console.error(`❌ Webhook signature verification failed: ${err.message}`)
      return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
    }

    // Process the event
    console.log(`🔄 Processing webhook event: ${event.type}`)
    
    switch (event.type) {
      case "checkout.session.completed":
        try {
          const session = event.data.object as Stripe.Checkout.Session
          console.log(`💳 Processing checkout session: ${session.id}`)
          
          const result = await processCheckoutSessionCompleted(session)
          console.log(`✅ Checkout session processed successfully:`, result)
          
          return NextResponse.json({ 
            received: true, 
            processed: true,
            sessionId: session.id,
            result: result
          })
        } catch (error: any) {
          console.error(`❌ Error processing checkout session:`, error)
          return NextResponse.json({ 
            error: error.message,
            received: true,
            processed: false
          }, { status: 400 })
        }

      default:
        console.log(`ℹ️ Unhandled webhook event type: ${event.type}`)
        return NextResponse.json({ received: true, processed: false })
    }

  } catch (error: any) {
    console.error("❌ Webhook processing error:", error)
    return NextResponse.json({ 
      error: "Webhook processing failed",
      details: error.message 
    }, { status: 500 })
  }
}
