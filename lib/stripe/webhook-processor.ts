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

export async function processCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`🎯 [Webhook] Processing checkout session completed: ${session.id} with mode: ${session.mode}`)

  try {
    if (session.mode === "subscription") {
      return await processSubscriptionCheckout(session)
    } else if (session.mode === "payment") {
      return await processBundleCheckout(session)
    } else {
      console.warn(`[Webhook] Unhandled checkout session mode: ${session.mode}`)
      return { success: true, message: "Unhandled mode" }
    }
  } catch (error) {
    console.error(`❌ [Webhook] Error processing checkout session completed:`, error)
    // Re-throwing the error will cause the webhook to return a 500, prompting Stripe to retry.
    throw error
  }
}

async function processBundleCheckout(session: Stripe.Checkout.Session) {
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

// New function to handle subscription checkout
async function processSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const uid = session.client_reference_id || getUidFromMetadata(session.metadata)
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id
  const email = session.customer_details?.email
  const priceId = session.metadata?.priceId || session.line_items?.data[0]?.price?.id

  if (!uid || !customerId || !subscriptionId || !email) {
    console.error("[Webhook] Missing required data in checkout.session.completed for subscription", {
      sessionId: session.id,
    })
    return { error: "Missing required data for subscription setup." }
  }

  console.log(`[Webhook] Processing subscription checkout for user ${uid}`)

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

  console.log(`[Webhook] User ${uid} successfully upgraded to Creator Pro.`)
  return { success: true, message: "Membership created successfully." }
}

// New exported function to handle subscription updates
export async function processSubscriptionUpdated(subscription: Stripe.Subscription) {
  const uid = getUidFromMetadata(subscription.metadata)
  if (!uid) {
    console.error("[Webhook] Missing UID in customer.subscription.updated metadata.", { subId: subscription.id })
    return { error: "Missing UID in subscription metadata." }
  }

  const status = subscription.status as MembershipStatus
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
  console.log(`[Webhook] Updating membership for user ${uid} to status ${status}`)

  await setCreatorProStatus(uid, status, {
    currentPeriodEnd,
    priceId: subscription.items.data[0]?.price.id,
  })

  console.log(`[Webhook] Membership status for ${uid} updated to ${status}.`)
  return { success: true }
}

// New exported function to handle subscription deletion
export async function processSubscriptionDeleted(subscription: Stripe.Subscription) {
  const uid = getUidFromMetadata(subscription.metadata)
  if (!uid) {
    console.error("[Webhook] Missing UID in customer.subscription.deleted metadata.", { subId: subscription.id })
    return { error: "Missing UID in subscription metadata." }
  }

  console.log(`[Webhook] Processing subscription deletion for user ${uid}`)
  const membership = await getMembership(uid)
  await setFree(uid, { email: membership?.email || undefined })
  console.log(`[Webhook] User ${uid} downgraded to Free.`)
  return { success: true }
}

export const StripeWebhookProcessor = {
  handleCheckoutSessionCompleted: processSubscriptionCheckout,
  handleSubscriptionUpdated: processSubscriptionUpdated,
  handleSubscriptionDeleted: processSubscriptionDeleted,
}
