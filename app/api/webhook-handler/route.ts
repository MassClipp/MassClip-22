import { NextResponse } from "next/server"
import Stripe from "stripe"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  const payload = await request.text()
  const sig = request.headers.get("stripe-signature") as string

  let event

  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret)
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  console.log(`Received webhook event: ${event.type}`)

  // Handle the event
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      console.log(`Processing checkout session: ${session.id}`)

      // We only process sessions that have metadata with userId
      if (!session.metadata?.userId) {
        console.error("Session has no userId metadata, skipping")
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
      }

      const userId = session.metadata.userId
      console.log(`Found userId in metadata: ${userId}`)

      // Get the customer ID from the session
      const customerId = session.customer as string
      console.log(`Customer ID from session: ${customerId}`)

      // Update the user's subscription status
      await getFirestore()
        .collection("users")
        .doc(userId)
        .update({
          plan: "pro",
          stripeSubscriptionId: session.subscription,
          stripeCustomerId: customerId,
          subscriptionUpdatedAt: new Date(),
          subscriptionStatus: "active",
          metadata: {
            checkoutSessionId: session.id,
            upgradedAt: new Date().toISOString(),
          },
        })

      console.log(`Updated user ${userId} to pro plan`)

      // Log the subscription event
      await getFirestore().collection("subscriptionEvents").add({
        userId: userId,
        eventType: "subscription_created",
        subscriptionId: session.subscription,
        checkoutSessionId: session.id,
        timestamp: new Date().toISOString(),
        metadata: session.metadata,
      })
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription
      console.log(`Processing subscription deletion: ${subscription.id}`)

      // We only process subscriptions that have metadata with userId
      if (!subscription.metadata?.userId) {
        console.error("Subscription has no userId metadata, skipping")
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
      }

      const userId = subscription.metadata.userId
      console.log(`Found userId in metadata: ${userId}`)

      // Update the user's subscription status
      await getFirestore()
        .collection("users")
        .doc(userId)
        .update({
          plan: "free",
          stripeSubscriptionId: null,
          subscriptionUpdatedAt: new Date(),
          subscriptionStatus: "expired",
          metadata: {
            subscriptionEndedAt: new Date().toISOString(),
            previousSubscriptionId: subscription.id,
          },
        })

      console.log(`Updated user ${userId} to free plan`)

      // Log the event
      await getFirestore().collection("subscriptionEvents").add({
        userId: userId,
        eventType: "subscription_expired",
        subscriptionId: subscription.id,
        timestamp: new Date().toISOString(),
        metadata: subscription.metadata,
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}
