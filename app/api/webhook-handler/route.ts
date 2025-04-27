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

      // Get the customer ID from the session
      const customerId = session.customer as string
      console.log(`Customer ID from session: ${customerId}`)

      // Find the user by Stripe customer ID
      const usersSnapshot = await getFirestore()
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get()

      if (usersSnapshot.empty) {
        console.error(`No user found with Stripe customer ID: ${customerId}`)

        // Try to find the session in our database
        const sessionDoc = await getFirestore().collection("stripeCheckoutSessions").doc(session.id).get()

        if (sessionDoc.exists) {
          const sessionData = sessionDoc.data()
          console.log(`Found session in database: ${session.id}, user: ${sessionData?.userId}`)

          // Update the user's subscription status
          await getFirestore().collection("users").doc(sessionData?.userId).update({
            plan: "pro",
            stripeSubscriptionId: session.subscription,
            stripeCustomerId: customerId,
            subscriptionUpdatedAt: new Date(),
            subscriptionStatus: "active",
          })

          console.log(`Updated user ${sessionData?.userId} to pro plan`)

          // Update the session status
          await getFirestore().collection("stripeCheckoutSessions").doc(session.id).update({
            status: "completed",
            completedAt: new Date(),
            subscriptionId: session.subscription,
          })

          return NextResponse.json({ received: true })
        }

        console.error("Could not find user for checkout session")
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const userDoc = usersSnapshot.docs[0]
      console.log(`Found user: ${userDoc.id}`)

      // Update the user's subscription status
      await getFirestore().collection("users").doc(userDoc.id).update({
        plan: "pro",
        stripeSubscriptionId: session.subscription,
        subscriptionUpdatedAt: new Date(),
        subscriptionStatus: "active",
      })

      console.log(`Updated user ${userDoc.id} to pro plan`)

      // Update the session status if it exists in our database
      const sessionDoc = await getFirestore().collection("stripeCheckoutSessions").doc(session.id).get()
      if (sessionDoc.exists) {
        await getFirestore().collection("stripeCheckoutSessions").doc(session.id).update({
          status: "completed",
          completedAt: new Date(),
          subscriptionId: session.subscription,
        })
      }
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription
      console.log(`Processing subscription deletion: ${subscription.id}`)

      // Get the customer ID from the subscription
      const customerId = subscription.customer as string

      // Check if this was canceled by the user through our app
      const metadata = subscription.metadata || {}
      const canceledByUser = metadata.canceledByUser === "true"
      const userId = metadata.userId

      console.log(`Subscription ${subscription.id} was canceled by user: ${canceledByUser}`)

      // If we have the userId in metadata, use it directly
      if (userId) {
        console.log(`Using userId from metadata: ${userId}`)

        // Update the user's subscription status
        await getFirestore().collection("users").doc(userId).update({
          plan: "free",
          stripeSubscriptionId: null,
          subscriptionUpdatedAt: new Date(),
          subscriptionStatus: "expired",
        })

        console.log(`Updated user ${userId} to free plan`)

        // Log the event
        await getFirestore().collection("subscriptionEvents").add({
          userId: userId,
          eventType: "subscription_expired",
          subscriptionId: subscription.id,
          timestamp: new Date().toISOString(),
        })

        return NextResponse.json({ received: true })
      }

      // Find the user by Stripe customer ID
      const usersSnapshot = await getFirestore()
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get()

      if (usersSnapshot.empty) {
        console.error(`No user found with Stripe customer ID: ${customerId}`)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const userDoc = usersSnapshot.docs[0]
      console.log(`Found user: ${userDoc.id}`)

      // Update the user's subscription status
      await getFirestore().collection("users").doc(userDoc.id).update({
        plan: "free",
        stripeSubscriptionId: null,
        subscriptionUpdatedAt: new Date(),
        subscriptionStatus: "expired",
      })

      console.log(`Updated user ${userDoc.id} to free plan`)

      // Log the event
      await getFirestore().collection("subscriptionEvents").add({
        userId: userDoc.id,
        eventType: "subscription_expired",
        subscriptionId: subscription.id,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}
