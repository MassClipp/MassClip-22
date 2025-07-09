import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    console.log(`🎣 [Stripe Webhook] Received webhook request`)

    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      console.error(`❌ [Stripe Webhook] No signature found`)
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    if (!webhookSecret) {
      console.error(`❌ [Stripe Webhook] No webhook secret configured`)
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(`✅ [Stripe Webhook] Event verified: ${event.type}`)
    } catch (err: any) {
      console.error(`❌ [Stripe Webhook] Signature verification failed:`, err.message)
      return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      case "account.updated":
        console.log(`ℹ️ [Stripe Webhook] Account updated event received`)
        break
      default:
        console.log(`ℹ️ [Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error(`❌ [Stripe Webhook] Error processing webhook:`, error)
    return NextResponse.json({ error: `Webhook processing failed: ${error.message}` }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log(`🛒 [Stripe Webhook] Processing checkout session completed: ${session.id}`)

    if (session.payment_status !== "paid") {
      console.log(`⚠️ [Stripe Webhook] Session ${session.id} payment not completed, status: ${session.payment_status}`)
      return
    }

    // Extract metadata
    const bundleId = session.metadata?.bundleId
    const userId = session.metadata?.userId
    const creatorId = session.metadata?.creatorId

    if (!bundleId || !userId) {
      console.error(`❌ [Stripe Webhook] Missing required metadata:`, {
        bundleId,
        userId,
        sessionId: session.id,
      })
      return
    }

    console.log(`📦 [Stripe Webhook] Processing purchase:`, {
      sessionId: session.id,
      bundleId,
      userId,
      creatorId,
      amount: session.amount_total,
    })

    // Create purchase record
    const purchaseData = {
      id: session.id,
      sessionId: session.id,
      stripeSessionId: session.id,
      bundleId: bundleId,
      userId: userId,
      creatorId: creatorId,
      amount: session.amount_total ? session.amount_total / 100 : 0, // Convert from cents
      currency: session.currency || "usd",
      status: "complete",
      stripeEnvironment: session.livemode ? "live" : "test",
      customerEmail: session.customer_email,
      createdAt: new Date().toISOString(),
      webhookProcessedAt: new Date().toISOString(),
      metadata: session.metadata || {},
    }

    // Store purchase in multiple locations using batch write
    const batch = db.batch()

    // 1. Store in user's purchases subcollection
    const userPurchaseRef = db.collection("users").doc(userId).collection("purchases").doc(session.id)
    batch.set(userPurchaseRef, purchaseData)

    // 2. Store in unified purchases collection
    const unifiedPurchaseRef = db.collection("userPurchases").doc(userId).collection("purchases").doc(session.id)
    batch.set(unifiedPurchaseRef, purchaseData)

    // 3. Store in creator's sales collection if creatorId exists
    if (creatorId) {
      const creatorSaleRef = db.collection("creators").doc(creatorId).collection("sales").doc(session.id)
      batch.set(creatorSaleRef, {
        ...purchaseData,
        saleDate: new Date().toISOString(),
      })
    }

    // Execute batch write
    await batch.commit()

    console.log(`✅ [Stripe Webhook] Purchase processed successfully: ${session.id}`)

    // Update bundle statistics
    try {
      const bundleRef = db.collection("bundles").doc(bundleId)
      await bundleRef.update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(purchaseData.amount),
        lastSaleAt: new Date().toISOString(),
      })
      console.log(`📊 [Stripe Webhook] Bundle statistics updated for: ${bundleId}`)
    } catch (statsError: any) {
      console.error(`⚠️ [Stripe Webhook] Failed to update bundle stats:`, statsError.message)
      // Don't fail the webhook for stats errors
    }
  } catch (error: any) {
    console.error(`❌ [Stripe Webhook] Error processing checkout session:`, error)
    throw error
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`💳 [Stripe Webhook] Processing payment intent succeeded: ${paymentIntent.id}`)

    // Log payment intent for debugging
    console.log(`💳 [Stripe Webhook] Payment intent details:`, {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
    })

    // Additional payment intent processing can be added here if needed
  } catch (error: any) {
    console.error(`❌ [Stripe Webhook] Error processing payment intent:`, error)
    throw error
  }
}
