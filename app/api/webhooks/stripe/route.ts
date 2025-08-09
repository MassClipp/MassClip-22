import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { processCheckoutSessionCompleted } from "@/lib/stripe/webhook-processor"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

// Use the correct environment variable name
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE!

export async function POST(request: NextRequest) {
  console.log("🎣 Stripe webhook received")
  
  try {
    // Get the raw body as text (required for signature verification)
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    console.log("🔍 Webhook verification details:")
    console.log("- Body length:", body.length)
    console.log("- Has signature:", !!signature)
    console.log("- Has webhook secret:", !!webhookSecret)
    console.log("- Using STRIPE_WEBHOOK_SECRET_LIVE")

    if (!signature) {
      console.error("❌ No Stripe signature found in headers")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    if (!webhookSecret) {
      console.error("❌ No webhook secret configured")
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    // Verify webhook signature with raw body
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(`✅ Webhook signature verified for event: ${event.type} (${event.id})`)
    } catch (err: any) {
      console.error(`❌ Webhook signature verification failed:`)
      console.error("- Error message:", err.message)
      console.error("- Error type:", err.type)
      console.error("- Body preview:", body.substring(0, 100) + "...")
      console.error("- Signature preview:", signature?.substring(0, 50) + "...")
      
      return NextResponse.json({ 
        error: `Webhook signature verification failed: ${err.message}`,
        debug: {
          hasSecret: !!webhookSecret,
          hasSignature: !!signature,
          bodyLength: body.length,
          errorType: err.type,
          usingSecret: "STRIPE_WEBHOOK_SECRET_LIVE"
        }
      }, { status: 400 })
    }

    // Process the event
    console.log(`🔄 Processing webhook event: ${event.type}`)
    
    switch (event.type) {
      case "checkout.session.completed":
        try {
          const session = event.data.object as Stripe.Checkout.Session
          console.log(`💳 Processing checkout session: ${session.id}`)
          console.log(`📋 Session metadata:`, session.metadata)
          
          const result = await processCheckoutSessionCompleted(session)
          
          if (result.alreadyProcessed) {
            console.log(`⚠️ Session already processed: ${session.id}`)
            return NextResponse.json({ 
              received: true, 
              processed: false,
              message: "Already processed",
              sessionId: session.id
            })
          }
          
          console.log(`✅ Checkout session processed successfully:`, {
            sessionId: result.sessionId,
            bundleTitle: result.bundleTitle,
            contentItems: result.contentItems
          })
          
          return NextResponse.json({ 
            received: true, 
            processed: true,
            sessionId: session.id,
            bundleTitle: result.bundleTitle,
            contentItems: result.contentItems,
            purchaseAmount: result.purchaseAmount
          })
        } catch (error: any) {
          console.error(`❌ Error processing checkout session:`, error)
          return NextResponse.json({ 
            error: error.message,
            received: true,
            processed: false
          }, { status: 400 })
        }

      case "account.updated":
        console.log(`🔄 Processing account.updated event`)
        // Handle account updates if needed
        return NextResponse.json({ received: true, processed: true })

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
