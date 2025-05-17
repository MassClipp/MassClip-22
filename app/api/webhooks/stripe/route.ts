import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import admin from "firebase-admin"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
})

// Webhook endpoint for Stripe events
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature") || ""

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET || "")
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
      break
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
      break
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

// Handle completed checkout sessions
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    if (!session.metadata?.purchaseId) {
      console.error("Missing purchaseId in session metadata")
      return
    }

    const { purchaseId, clipId, userId, creatorId } = session.metadata

    // Update purchase status to completed
    const purchaseRef = db.collection("purchases").doc(purchaseId)
    await purchaseRef.update({
      status: "completed",
      stripeSessionId: session.id,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Add the clip to the user's purchased clips collection
    await db.collection("users").doc(userId).collection("purchasedClips").doc(clipId).set({
      clipId,
      purchaseId,
      creatorId,
      purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Increment the creator's sales metrics
    const creatorRef = db.collection("users").doc(creatorId)
    await creatorRef.update({
      totalSales: admin.firestore.FieldValue.increment(1),
      totalRevenue: admin.firestore.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
    })

    // Increment the clip's purchase count
    const clipRef = db.collection("clips").doc(clipId)
    await clipRef.update({
      purchaseCount: admin.firestore.FieldValue.increment(1),
    })

    console.log(`Purchase ${purchaseId} completed successfully`)
  } catch (error) {
    console.error("Error handling checkout session completed:", error)
  }
}

// Handle successful payment intents
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // This function can be implemented if you need additional logic when payments succeed
  console.log(`PaymentIntent ${paymentIntent.id} succeeded`)
}
