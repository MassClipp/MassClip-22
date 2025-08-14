import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
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

    const membershipDoc = await adminDb.collection("memberships").doc(userId).get()

    if (!membershipDoc.exists) {
      return NextResponse.json({ error: "No active membership found" }, { status: 404 })
    }

    const membershipData = membershipDoc.data()
    const stripeSubscriptionId = membershipData?.stripeSubscriptionId

    if (!stripeSubscriptionId) {
      return NextResponse.json({ error: "No subscription found in Stripe" }, { status: 404 })
    }

    let subscription
    try {
      subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
      if (subscription.status === "canceled") {
        return NextResponse.json({ error: "Subscription is already canceled" }, { status: 400 })
      }
    } catch (stripeError) {
      return NextResponse.json({ error: "Subscription not found in Stripe" }, { status: 404 })
    }

    const canceledSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    await membershipDoc.ref.update({
      status: "canceled",
      canceledAt: new Date().toISOString(),
      currentPeriodEnd: new Date(canceledSubscription.current_period_end * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: "Subscription canceled successfully. Access will continue until the end of your billing period.",
      endDate: new Date(canceledSubscription.current_period_end * 1000).toISOString(),
    })
  } catch (error) {
    console.error("Error canceling subscription:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel subscription" },
      { status: 500 },
    )
  }
}
