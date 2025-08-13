import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

// --- Types ---
type MembershipPlan = "free" | "creator_pro"
type MembershipStatus = "active" | "inactive" | "canceled" | "past_due" | "trialing"

const PRO_FEATURES = {
  unlimitedDownloads: true,
  premiumContent: true,
  noWatermark: true,
  prioritySupport: true,
  platformFeePercentage: 10,
  maxVideosPerBundle: null,
  maxBundles: null,
}

const FREE_FEATURES = {
  unlimitedDownloads: false,
  premiumContent: false,
  noWatermark: false,
  prioritySupport: false,
  platformFeePercentage: 20,
  maxVideosPerBundle: 10,
  maxBundles: 2,
}

// --- Helper Functions ---

async function findUserByCustomerId(customerId: string): Promise<string | null> {
  if (!db) throw new Error("Firestore not initialized")
  const memberships = db.collection("memberships")
  const snapshot = await memberships.where("stripeCustomerId", "==", customerId).limit(1).get()
  if (snapshot.empty) {
    console.log(`Could not find user with Stripe Customer ID: ${customerId}`)
    return null
  }
  return snapshot.docs[0].id
}

async function setMembership(uid: string, data: object) {
  if (!db) throw new Error("Firestore not initialized")
  const docRef = db.collection("memberships").doc(uid)
  await docRef.set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  console.log(`Updated membership for user ${uid}`)
}

// --- Exported Processing Functions ---

export async function processCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.buyerUid
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id

  if (!userId) {
    throw new Error(`Missing buyerUid in checkout session metadata. Session ID: ${session.id}`)
  }
  if (!customerId) {
    throw new Error(`Missing customerId in checkout session. Session ID: ${session.id}`)
  }
  if (!subscriptionId) {
    throw new Error(`Missing subscriptionId in checkout session. Session ID: ${session.id}`)
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  await setMembership(userId, {
    uid: userId,
    plan: "creator_pro",
    status: subscription.status,
    isActive: subscription.status === "active" || subscription.status === "trialing",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    priceId: subscription.items.data[0]?.price.id,
    features: PRO_FEATURES,
  })
}

export async function processSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  const userId = await findUserByCustomerId(customerId)

  if (!userId) {
    throw new Error(`Webhook Error: User not found for customer ID: ${customerId}`)
  }

  await setMembership(userId, {
    status: subscription.status,
    isActive: subscription.status === "active" || subscription.status === "trialing",
    priceId: subscription.items.data[0]?.price.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  })
}

export async function processSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  const userId = await findUserByCustomerId(customerId)

  if (!userId) {
    // This can happen if a user is deleted from the app but not from Stripe.
    console.log(
      `Webhook Info: Received subscription deleted event for a user not found in DB. Customer ID: ${customerId}`,
    )
    return
  }

  await setMembership(userId, {
    plan: "free",
    status: "canceled",
    isActive: false,
    features: FREE_FEATURES,
    // We keep stripe IDs for historical purposes but nullify the subscription specific fields
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    priceId: null,
  })
}

export async function processPaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { buyerUid, productType, productId, creatorId } = paymentIntent.metadata

  if (!buyerUid || !productType || !productId || !creatorId) {
    console.error("Webhook Error: Missing required metadata in paymentIntent.succeeded event.", {
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata,
    })
    throw new Error("Missing required metadata in paymentIntent.succeeded event.")
  }

  const purchaseRef = db.collection("purchases").doc(paymentIntent.id)
  const purchaseDoc = await purchaseRef.get()

  if (purchaseDoc.exists) {
    console.log(`Webhook Info: Purchase with paymentIntentId ${paymentIntent.id} already processed.`)
    return
  }

  const purchaseData = {
    userId: buyerUid,
    creatorId,
    productType,
    productId,
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: "completed",
    purchaseDate: new Date(paymentIntent.created * 1000),
    stripeCustomerId: typeof paymentIntent.customer === "string" ? paymentIntent.customer : paymentIntent.customer?.id,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  }

  await purchaseRef.set(purchaseData)
  console.log(`Successfully created purchase record for paymentIntentId: ${paymentIntent.id}`)
}

export async function processInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Extract metadata from the invoice line items
  const lineItem = invoice.lines.data[0]
  const metadata = lineItem?.metadata || {}

  const userId = metadata.userId || metadata.buyerUid
  const plan = metadata.plan
  const contentType = metadata.contentType

  if (!userId) {
    throw new Error(`Missing userId in invoice metadata. Invoice ID: ${invoice.id}`)
  }

  if (contentType !== "membership") {
    console.log(`Invoice ${invoice.id} is not for membership, skipping`)
    return
  }

  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id

  if (!customerId) {
    throw new Error(`Missing customerId in invoice. Invoice ID: ${invoice.id}`)
  }

  // Get subscription details if available
  let subscriptionId: string | null = null
  let subscription: Stripe.Subscription | null = null

  if (invoice.subscription) {
    subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    subscription = await stripe.subscriptions.retrieve(subscriptionId)
  }

  // Determine plan and features
  const membershipPlan: MembershipPlan = plan === "creator_pro" ? "creator_pro" : "free"
  const features = membershipPlan === "creator_pro" ? PRO_FEATURES : FREE_FEATURES

  await setMembership(userId, {
    uid: userId,
    plan: membershipPlan,
    status: subscription?.status || "active",
    isActive: subscription ? subscription.status === "active" || subscription.status === "trialing" : true,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    currentPeriodEnd: subscription ? new Date(subscription.current_period_end * 1000) : null,
    priceId: lineItem?.pricing?.price_details?.price || null,
    features,
  })

  console.log(`Successfully processed invoice payment for user ${userId} with plan ${membershipPlan}`)
}
