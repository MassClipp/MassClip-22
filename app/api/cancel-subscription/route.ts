import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"
import { setCreatorProStatus } from "@/lib/memberships-service"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Get the user from Firestore
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeCustomerId = userData?.stripeCustomerId

    if (!stripeCustomerId) {
      return NextResponse.json({ error: "No subscription found for this user" }, { status: 404 })
    }

    // Get customer's subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    // Cancel the subscription at period end
    const subscription = await stripe.subscriptions.update(subscriptions.data[0].id, {
      cancel_at_period_end: true,
    })

    // Update the user document with cancellation info
    await userDoc.ref.update({
      subscriptionCanceledAt: new Date().toISOString(),
      subscriptionStatus: "canceled",
      subscriptionEndDate: new Date(subscription.current_period_end * 1000).toISOString(),
    })

    await setCreatorProStatus(userId, "canceled", {
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    })

    return NextResponse.json({
      success: true,
      message: "Subscription canceled successfully",
      endDate: new Date(subscription.current_period_end * 1000).toISOString(),
    })
  } catch (error) {
    console.error("Error canceling subscription:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel subscription" },
      { status: 500 },
    )
  }
}
