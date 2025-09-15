import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export interface StripeSubscriptionStatus {
  isActive: boolean
  isCanceled: boolean
  status: string
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  plan: "free" | "creator_pro"
}

export async function getStripeSubscriptionStatus(userId: string): Promise<StripeSubscriptionStatus> {
  try {
    // Get membership document
    const membershipDoc = await adminDb.collection("memberships").doc(userId).get()

    if (!membershipDoc.exists) {
      return {
        isActive: false,
        isCanceled: false,
        status: "inactive",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        plan: "free",
      }
    }

    const membershipData = membershipDoc.data()!
    const stripeSubscriptionId = membershipData.stripeSubscriptionId

    if (!stripeSubscriptionId) {
      return {
        isActive: false,
        isCanceled: false,
        status: "inactive",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        plan: "free",
      }
    }

    let subscription: Stripe.Subscription
    try {
      subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
    } catch (error) {
      console.error("Failed to retrieve subscription from Stripe:", error)
      // If subscription doesn't exist in Stripe, treat as canceled
      return {
        isActive: false,
        isCanceled: true,
        status: "canceled",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        plan: "free",
      }
    }

    const now = new Date()
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

    const isActiveInStripe = ["active", "trialing"].includes(subscription.status)
    const isWithinPeriod = now <= currentPeriodEnd
    const isCanceled = subscription.cancel_at_period_end || subscription.status === "canceled"

    const isActive = isActiveInStripe && isWithinPeriod

    if (!isActive || subscription.status === "canceled") {
      await adminDb
        .collection("memberships")
        .doc(userId)
        .update({
          isActive: isActive,
          status: isCanceled ? "canceled" : subscription.status,
          plan: isActive ? "creator_pro" : "free",
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          updatedAt: new Date().toISOString(),
        })

      // If completely expired, move to freeUsers
      if (!isActive) {
        await adminDb.collection("freeUsers").doc(userId).set({
          uid: userId,
          plan: "free",
          downloadsUsed: 0,
          bundlesCreated: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    } else {
      await adminDb.collection("memberships").doc(userId).update({
        isActive: true,
        status: subscription.status,
        plan: "creator_pro",
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date().toISOString(),
      })
    }

    return {
      isActive,
      isCanceled,
      status: subscription.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      plan: isActive ? "creator_pro" : "free",
    }
  } catch (error) {
    console.error("Error checking Stripe subscription status:", error)
    return {
      isActive: false,
      isCanceled: false,
      status: "error",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      plan: "free",
    }
  }
}
