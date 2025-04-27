import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`Processing subscription cancellation for user: ${userId}`)

    // Get the user from Firestore
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.error(`User not found: ${userId}`)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeCustomerId = userData?.stripeCustomerId

    if (!stripeCustomerId) {
      console.error(`No Stripe customer ID found for user: ${userId}`)
      return NextResponse.json({ error: "No subscription found for this user" }, { status: 404 })
    }

    console.log(`Found Stripe customer ID: ${stripeCustomerId}`)

    // Get customer's subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
    })

    if (subscriptions.data.length === 0) {
      console.error(`No active subscription found for customer: ${stripeCustomerId}`)
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    const subscription = subscriptions.data[0]
    console.log(`Found active subscription: ${subscription.id}`)

    // Cancel the subscription at period end
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
      metadata: {
        canceledByUser: "true",
        canceledAt: new Date().toISOString(),
        userId: userId,
      },
    })

    console.log(`Subscription ${subscription.id} updated with cancel_at_period_end=true`)

    // Update the user document with cancellation info
    await userDoc.ref.update({
      subscriptionCanceledAt: new Date().toISOString(),
      subscriptionStatus: "canceled",
      subscriptionEndDate: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
    })

    console.log(`User ${userId} subscription status updated to canceled`)

    // Log the cancellation event
    await db.collection("subscriptionEvents").add({
      userId: userId,
      eventType: "subscription_canceled",
      subscriptionId: subscription.id,
      timestamp: new Date().toISOString(),
      endDate: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: "Subscription canceled successfully",
      endDate: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
    })
  } catch (error) {
    console.error("Error canceling subscription:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel subscription" },
      { status: 500 },
    )
  }
}
