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
    const stripeSubscriptionId = userData?.stripeSubscriptionId
    const stripeCustomerId = userData?.stripeCustomerId

    if (!stripeSubscriptionId) {
      console.error(`No subscription ID found for user: ${userId}`)
      return NextResponse.json({ error: "No subscription found for this user" }, { status: 404 })
    }

    console.log(`Found subscription ID: ${stripeSubscriptionId}`)

    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)

    if (subscription.status !== "active") {
      console.error(`Subscription ${stripeSubscriptionId} is not active: ${subscription.status}`)
      return NextResponse.json({ error: "Subscription is not active" }, { status: 400 })
    }

    // Cancel the subscription at period end
    const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
      metadata: {
        userId: userId,
        canceledByUser: "true",
        canceledAt: new Date().toISOString(),
        originalStatus: subscription.status,
      },
    })

    console.log(`Subscription ${stripeSubscriptionId} updated with cancel_at_period_end=true`)

    // Update the user document with cancellation info
    await userDoc.ref.update({
      subscriptionCanceledAt: new Date().toISOString(),
      subscriptionStatus: "canceled",
      subscriptionEndDate: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
      metadata: {
        canceledAt: new Date().toISOString(),
        cancelReason: "user_requested",
      },
    })

    console.log(`User ${userId} subscription status updated to canceled`)

    // Log the cancellation event
    await db.collection("subscriptionEvents").add({
      userId: userId,
      eventType: "subscription_canceled",
      subscriptionId: stripeSubscriptionId,
      timestamp: new Date().toISOString(),
      endDate: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
      metadata: {
        canceledByUser: true,
        canceledAt: new Date().toISOString(),
      },
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
