import Stripe from "stripe"
import {
  setCreatorPro,
  setCreatorProStatus,
  setFree,
  getMembership,
  type MembershipStatus,
} from "@/lib/memberships-service"

// Helper to extract UID from various metadata locations
function getUidFromMetadata(metadata: Stripe.Metadata | null | undefined): string | null {
  if (!metadata) return null
  return metadata.buyerUid || metadata.firebaseUid || metadata.userId || null
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const uid = session.client_reference_id || getUidFromMetadata(session.metadata)
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id
  const email = session.customer_details?.email
  const priceId = session.metadata?.priceId || session.line_items?.data[0]?.price?.id

  if (!uid || !customerId || !subscriptionId || !email) {
    console.error("Webhook Processor: Missing required data in checkout.session.completed", {
      uid,
      customerId,
      subscriptionId,
      email,
    })
    return
  }

  console.log(`Webhook Processor: Processing checkout.session.completed for user ${uid}`)

  try {
    // We need to fetch the subscription to get the current_period_end
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

    await setCreatorPro(uid, {
      email,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      priceId: priceId || undefined,
      currentPeriodEnd: currentPeriodEnd,
      status: "active",
    })

    console.log(`Webhook Processor: User ${uid} successfully upgraded to Creator Pro via checkout session.`)
  } catch (error) {
    console.error(`Webhook Processor: Error upgrading user ${uid} from checkout session:`, error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const uid = getUidFromMetadata(subscription.metadata)

  if (!uid) {
    // Fallback for older subscriptions without metadata
    // This requires a lookup in your DB from customerId to uid.
    // For now, we'll log an error.
    console.error("Webhook Processor: Missing UID in subscription.updated metadata.", {
      subId: subscription.id,
      customerId: subscription.customer,
    })
    return
  }

  const status = subscription.status as MembershipStatus
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

  console.log(`Webhook Processor: Processing customer.subscription.updated for user ${uid} to status ${status}`)

  try {
    await setCreatorProStatus(uid, status, {
      currentPeriodEnd,
      priceId: subscription.items.data[0]?.price.id,
    })
    console.log(`Webhook Processor: Membership status for ${uid} updated to ${status}.`)
  } catch (error) {
    console.error(`Webhook Processor: Error updating membership status for user ${uid}:`, error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const uid = getUidFromMetadata(subscription.metadata)

  if (!uid) {
    console.error("Webhook Processor: Missing UID in subscription.deleted metadata.", {
      subId: subscription.id,
      customerId: subscription.customer,
    })
    return
  }

  console.log(`Webhook Processor: Processing customer.subscription.deleted for user ${uid}`)

  try {
    const membership = await getMembership(uid)
    await setFree(uid, { email: membership?.email || undefined })
    console.log(`Webhook Processor: User ${uid} downgraded to Free due to subscription deletion.`)
  } catch (error) {
    console.error(`Webhook Processor: Error downgrading user ${uid} to Free:`, error)
  }
}

export const StripeWebhookProcessor = {
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
}
