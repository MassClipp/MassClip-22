import Stripe from "stripe"
import { adminDb as db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

// --- Types ---
type MembershipPlan = "free" | "creator_pro" | "starter"
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

const STARTER_FEATURES = {
  unlimitedDownloads: false,
  premiumContent: false,
  noWatermark: false,
  prioritySupport: false,
  platformFeePercentage: 20,
  maxVideosPerBundle: 15,
  maxBundles: 5,
  maxFolders: 3,
  canCreateSubfolders: true,
  canAnalyzeTranscripts: false,
}

const PRICE_ID_TO_PLAN_CONFIG = {
  price_1SKKFPDheyb0pkWFBT6lf7V7: {
    plan: "starter" as MembershipPlan,
    features: STARTER_FEATURES,
    displayName: "Starter Plan",
  },
  price_1SK7SzDheyb0pkWFaKOzIOzf: {
    plan: "creator_pro" as MembershipPlan,
    features: PRO_FEATURES,
    displayName: "Creator VIP",
  },
} as const

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

function getPlanConfigFromPriceId(priceId: string) {
  console.log(`[v0] 🔍 Looking up price ID: ${priceId}`)

  const config = PRICE_ID_TO_PLAN_CONFIG[priceId as keyof typeof PRICE_ID_TO_PLAN_CONFIG]

  if (!config) {
    console.error(`[v0] ❌ UNKNOWN PRICE ID: ${priceId}`)
    console.error(`[v0] ❌ Known price IDs:`, Object.keys(PRICE_ID_TO_PLAN_CONFIG))
    throw new Error(`Unknown Stripe price ID: ${priceId}. Cannot determine plan.`)
  }

  console.log(`[v0] ✅ Price ID ${priceId} → ${config.displayName} (${config.plan})`)
  return config
}

// --- Exported Processing Functions ---

export async function processCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.buyerUid
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id

  if (!userId) {
    throw new Error(`Missing buyerUid in checkout session metadata. Session ID: ${session.id}`)
  }
  if (!customerId) {
    throw new Error(`Missing customerId in checkout session. Session ID: ${session.id}`)
  }

  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id

  if (!subscriptionId) {
    throw new Error(`Missing subscriptionId in checkout session. Session ID: ${session.id}`)
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id

  if (!priceId) {
    throw new Error(`Missing price ID in subscription ${subscriptionId}`)
  }

  console.log(`[v0] 📋 Processing checkout for user ${userId}`)
  console.log(`[v0] 💳 Subscription ID: ${subscriptionId}`)
  console.log(`[v0] 💰 Price ID: ${priceId}`)

  const { plan, features, displayName } = getPlanConfigFromPriceId(priceId)

  console.log(`[v0] 🎯 Assigning ${displayName}:`)
  console.log(`[v0]    - plan: "${plan}"`)
  console.log(`[v0]    - platformFeePercentage: ${features.platformFeePercentage}%`)
  console.log(`[v0]    - maxBundles: ${features.maxBundles || "unlimited"}`)
  console.log(`[v0]    - maxVideosPerBundle: ${features.maxVideosPerBundle || "unlimited"}`)
  console.log(`[v0]    - unlimitedDownloads: ${features.unlimitedDownloads}`)

  await setMembership(userId, {
    uid: userId,
    plan: plan,
    status: subscription.status,
    isActive: subscription.status === "active" || subscription.status === "trialing",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    priceId: priceId,
    ...features, // Spread all features directly into the document
  })

  console.log(`[v0] ✅ Successfully set memberships/${userId} to ${displayName}`)
}

export async function processSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  const userId = await findUserByCustomerId(customerId)

  if (!userId) {
    throw new Error(`Webhook Error: User not found for customer ID: ${customerId}`)
  }

  const priceId = subscription.items.data[0]?.price.id

  if (!priceId) {
    throw new Error(`Missing price ID in subscription ${subscription.id}`)
  }

  console.log(`[v0] 🔄 Updating subscription for user ${userId}`)
  console.log(`[v0] 💰 Price ID: ${priceId}`)

  const { plan, features, displayName } = getPlanConfigFromPriceId(priceId)

  console.log(`[v0] 🎯 Updating to ${displayName} (${plan})`)

  await setMembership(userId, {
    plan: plan,
    status: subscription.status,
    isActive: subscription.status === "active" || subscription.status === "trialing",
    priceId: priceId,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    ...features, // Spread all features directly
  })

  console.log(`[v0] ✅ Successfully updated memberships/${userId} to ${displayName}`)
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
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    priceId: null,
    ...FREE_FEATURES, // Spread free features directly
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
