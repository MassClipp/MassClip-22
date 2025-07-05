import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    console.log("🎣 [Webhook] Received Stripe webhook")

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("❌ [Webhook] Signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log(`📨 [Webhook] Event type: ${event.type}`)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`✅ [Webhook] Checkout completed: ${session.id}`)

        await handleCheckoutCompleted(session)
        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`💰 [Webhook] Payment succeeded: ${paymentIntent.id}`)
        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`❌ [Webhook] Payment failed: ${paymentIntent.id}`)

        // Mark purchase as failed
        if (paymentIntent.metadata?.productBoxId) {
          await adminDb.collection("purchases").doc(paymentIntent.id).update({
            status: "failed",
            updatedAt: new Date(),
            failureReason: "Payment failed",
          })
        }
        break
      }

      default:
        console.log(`ℹ️ [Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Webhook] Error processing webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log(`🔄 [Webhook] Processing checkout completion: ${session.id}`)
    console.log(`📋 [Webhook] Session metadata:`, session.metadata)

    const { productBoxId, userId, creatorId, type } = session.metadata || {}

    if (!productBoxId || !userId) {
      console.error("❌ [Webhook] Missing required metadata in session")
      return
    }

    // Get the pending purchase record
    const purchaseRef = adminDb.collection("purchases").doc(session.id)
    const purchaseDoc = await purchaseRef.get()

    if (!purchaseDoc.exists) {
      console.log("⚠️ [Webhook] Purchase record not found, creating new one")

      // Create new purchase record if it doesn't exist
      const purchaseData = {
        id: session.id,
        userId: userId,
        productBoxId: productBoxId,
        creatorId: creatorId,
        title: "Premium Content Bundle",
        price: (session.amount_total || 0) / 100, // Convert from cents
        currency: session.currency || "usd",
        status: "completed",
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: type || "product_box",
        metadata: {
          contentType: "video",
          contentCount: 0,
        },
      }

      await purchaseRef.set(purchaseData)
      console.log(`✅ [Webhook] Created new purchase record: ${session.id}`)
    } else {
      // Update existing purchase record
      await purchaseRef.update({
        status: "completed",
        stripePaymentIntentId: session.payment_intent,
        updatedAt: new Date(),
        completedAt: new Date(),
      })
      console.log(`✅ [Webhook] Updated existing purchase record: ${session.id}`)
    }

    // Update user's purchase history
    if (userId && productBoxId) {
      const userRef = adminDb.collection("users").doc(userId)
      await userRef.update({
        [`purchases.${productBoxId}`]: {
          purchaseId: session.id,
          purchasedAt: new Date(),
          status: "completed",
        },
        updatedAt: new Date(),
      })
      console.log(`👤 [Webhook] Updated user purchase history: ${userId}`)
    }

    console.log(`🎉 [Webhook] Successfully processed checkout completion: ${session.id}`)
  } catch (error) {
    console.error("❌ [Webhook] Error handling checkout completion:", error)
    throw error
  }
}
