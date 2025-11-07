import Stripe from "stripe"
import { adminDb as db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

// --- Types ---
type MembershipPlan = "free" | "creator_pro" | "starter" | "facelessprenuer" | "faceless_pro"
type MembershipStatus = "active" | "inactive" | "canceled" | "past_due" | "trialing"

const PLAN_CONFIGS = {
  starter: {
    plan: "starter" as const,
    features: {
      maxBundles: 5,
      maxVideosPerBundle: 15,
      maxFolders: 3,
      noWatermark: false,
      platformFeePercentage: 20,
      premiumContent: false,
      prioritySupport: false,
      unlimitedDownloads: false,
      isActive: true,
    },
  },
  faceless_pro: {
    plan: "faceless_pro" as const,
    features: {
      maxBundles: 5,
      maxVideosPerBundle: 15,
      maxFolders: 3,
      noWatermark: false,
      platformFeePercentage: 20,
      premiumContent: false,
      prioritySupport: false,
      unlimitedDownloads: false,
      isActive: true,
    },
  },
  facelessprenuer: {
    plan: "facelessprenuer" as const,
    features: {
      maxBundles: null,
      maxVideosPerBundle: null,
      maxFolders: null,
      noWatermark: true,
      platformFeePercentage: 10,
      premiumContent: true,
      prioritySupport: true,
      unlimitedDownloads: true,
      isActive: true,
    },
  },
  creator_pro: {
    plan: "creator_pro" as const,
    features: {
      maxBundles: null,
      maxVideosPerBundle: null,
      maxFolders: null,
      noWatermark: true,
      platformFeePercentage: 10,
      premiumContent: true,
      prioritySupport: true,
      unlimitedDownloads: true,
      isActive: true,
    },
  },
  free: {
    plan: "free" as const,
    features: {
      maxBundles: 2,
      maxVideosPerBundle: 10,
      maxFolders: 1,
      noWatermark: false,
      platformFeePercentage: 20,
      premiumContent: false,
      prioritySupport: false,
      unlimitedDownloads: false,
      isActive: false,
    },
  },
}

const PRICE_ID_TO_PLAN: Record<string, keyof typeof PLAN_CONFIGS> = {
  // Hardcoded Starter price (for backwards compatibility)
  price_1SKKFPDheyb0pkWFBT6lf7V7: "starter",

  // Environment variable price IDs
  [process.env.STARTER_PLAN_FIRST || ""]: "starter",
  [process.env.STARTER_PLAN_REGULAR || ""]: "starter",
  [process.env.CREATOR_PRO_FIRST || ""]: "creator_pro",
  [process.env.CREATOR_PRO_REGULAR || ""]: "creator_pro",

  // Faceless Pro
  [process.env.FACELESS_PRO_FIRST || ""]: "faceless_pro",
  [process.env.FACELESS_PRO_REGULAR || ""]: "faceless_pro",
  ["price_1SQ8yADheyb0pkWFK5LCP3Nd"]: "faceless_pro",

  // Facelessprenuer
  [process.env.FACELESSPRENUER_FIRST || ""]: "facelessprenuer",
  [process.env.FACELESSPRENUER_REGULAR || ""]: "facelessprenuer",
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

async function setMembership(uid: string, data: any) {
  if (!db) throw new Error("Firestore not initialized")
  const docRef = db.collection("memberships").doc(uid)

  console.log(`[v0] 💾 ========== WRITING TO FIRESTORE ==========`)
  console.log(`[v0] 💾 User ID: ${uid}`)
  console.log(`[v0] 💾 Plan: ${data.plan}`)
  console.log(`[v0] 💾 Status: ${data.status}`)
  console.log(`[v0] 💾 IsActive: ${data.isActive}`)
  console.log(`[v0] 💾 Price ID: ${data.priceId}`)
  console.log(`[v0] 💾 Features:`, JSON.stringify(data.features, null, 2))
  console.log(`[v0] 💾 Full Document:`, JSON.stringify(data, null, 2))
  console.log(`[v0] 💾 ==========================================`)

  // ALWAYS use .set() without merge to do complete replacement
  await docRef.set({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  })

  console.log(`[v0] ✅ Membership document written successfully`)
}

function getPlanConfig(priceId: string) {
  console.log(`[v0] 🔍 Looking up price ID: ${priceId}`)
  console.log(`[v0] 📋 Available price IDs:`, Object.keys(PRICE_ID_TO_PLAN))

  const planKey = PRICE_ID_TO_PLAN[priceId]

  if (!planKey) {
    console.error(`[v0] ❌ UNKNOWN PRICE ID: ${priceId}`)
    throw new Error(`Unknown Stripe price ID: ${priceId}. Cannot determine plan.`)
  }

  const config = PLAN_CONFIGS[planKey]
  console.log(`[v0] ✅ Price ID ${priceId} → ${planKey}`)
  console.log(`[v0]    - maxBundles: ${config.features.maxBundles}`)
  console.log(`[v0]    - platformFeePercentage: ${config.features.platformFeePercentage}%`)

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

  const planConfig = getPlanConfig(priceId)
  const isActive = subscription.status === "active" || subscription.status === "trialing"

  const membershipData = {
    uid: userId,
    plan: planConfig.plan,
    status: subscription.status,
    isActive,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    priceId: priceId,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: {
      ...planConfig.features,
      isActive, // Override with actual subscription status
    },
    createdAt: FieldValue.serverTimestamp(),
  }

  await setMembership(userId, membershipData)

  console.log(`[v0] ✅ Successfully set membership for ${userId} to ${planConfig.plan}`)
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
  console.log(`[v0] 📊 Status: ${subscription.status}`)

  const planConfig = getPlanConfig(priceId)
  const isActive = subscription.status === "active" || subscription.status === "trialing"

  const membershipData = {
    uid: userId,
    plan: planConfig.plan,
    status: subscription.status,
    isActive,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    priceId: priceId,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: {
      ...planConfig.features,
      isActive, // Override with actual subscription status
    },
  }

  await setMembership(userId, membershipData)

  console.log(`[v0] ✅ Successfully updated membership for ${userId} to ${planConfig.plan}`)
}

export async function processSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  const userId = await findUserByCustomerId(customerId)

  if (!userId) {
    console.log(
      `Webhook Info: Received subscription deleted event for a user not found in DB. Customer ID: ${customerId}`,
    )
    return
  }

  console.log(`[v0] 🗑️ Moving user ${userId} to freeUsers collection`)

  // Remove from memberships
  await db.collection("memberships").doc(userId).delete()

  // Add to freeUsers
  await db.collection("freeUsers").doc(userId).set({
    uid: userId,
    plan: "free",
    downloadsUsed: 0,
    bundlesCreated: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  console.log(`[v0] ✅ User ${userId} moved to freeUsers`)
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
