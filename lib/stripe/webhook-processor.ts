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

// --- Constants ---
const STARTER_PRICE_ID = "price_1SKKFPDheyb0pkWFBT6lf7V7"
const CREATOR_VIP_PRICE_IDS = ["price_1SK7SzDheyb0pkWFaKOzIOzf"] // Can add more VIP price IDs here

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

function getPlanFromPriceId(priceId: string): MembershipPlan {
  if (priceId === STARTER_PRICE_ID) {
    return "starter"
  }
  if (CREATOR_VIP_PRICE_IDS.includes(priceId)) {
    return "creator_pro"
  }
  // Default to creator_pro for unknown price IDs
  console.log(`⚠️ [Webhook] Unknown price ID: ${priceId}, defaulting to creator_pro`)
  return "creator_pro"
}

// --- Exported Processing Functions ---

export async function processCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.buyerUid
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id

  console.log(`[v0] [Webhook] Session metadata:`, JSON.stringify(session.metadata, null, 2))

  const metadataPlan = session.metadata?.plan
  console.log(`[v0] [Webhook] Plan from metadata: ${metadataPlan}`)

  if (!subscriptionId) {
    throw new Error(`Missing subscriptionId in checkout session. Session ID: ${session.id}`)
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id

  console.log(`[v0] [Webhook] Price ID from subscription: ${priceId}`)

  const planFromPriceId = getPlanFromPriceId(priceId)
  console.log(`[v0] [Webhook] Plan from price ID: ${planFromPriceId}`)

  const plan = metadataPlan || planFromPriceId
  console.log(`[v0] [Webhook] Final plan decision: ${plan} (from ${metadataPlan ? "metadata" : "price ID"})`)

  const isFirstTimeDiscount = session.metadata?.isFirstTimeDiscount === "true"

  if (!userId) {
    throw new Error(`Missing buyerUid in checkout session metadata. Session ID: ${session.id}`)
  }
  if (!customerId) {
    throw new Error(`Missing customerId in checkout session. Session ID: ${session.id}`)
  }

  const features = plan === "starter" ? STARTER_FEATURES : PRO_FEATURES
  console.log(`[v0] [Webhook] Assigning ${plan} features to user ${userId}:`, JSON.stringify(features, null, 2))

  await setMembership(userId, {
    uid: userId,
    plan: plan as "starter" | "creator_pro",
    status: subscription.status,
    isActive: subscription.status === "active" || subscription.status === "trialing",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    priceId: priceId,
    ...features, // Spread features directly into the document
  })

  console.log(
    `[v0] ✅ [Webhook] memberships/${userId} set to ${plan} with ${plan === "starter" ? "Starter" : "VIP"} features`,
  )
  console.log(`[v0] [Webhook] Membership document should now have:`)
  console.log(`[v0]   - plan: "${plan}"`)
  console.log(`[v0]   - platformFeePercentage: ${features.platformFeePercentage}`)
  console.log(`[v0]   - maxBundles: ${features.maxBundles}`)
  console.log(`[v0]   - unlimitedDownloads: ${features.unlimitedDownloads}`)
}

export async function processSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  const userId = await findUserByCustomerId(customerId)

  if (!userId) {
    throw new Error(`Webhook Error: User not found for customer ID: ${customerId}`)
  }

  const priceId = subscription.items.data[0]?.price.id
  const plan = getPlanFromPriceId(priceId)
  const features = plan === "starter" ? STARTER_FEATURES : PRO_FEATURES

  console.log(`[Webhook] Updating subscription for user ${userId}`)
  console.log(`[Webhook] Price ID: ${priceId} → Plan: ${plan}`)
  console.log(`[Webhook] Assigning features:`, features)

  await setMembership(userId, {
    plan: plan,
    status: subscription.status,
    isActive: subscription.status === "active" || subscription.status === "trialing",
    priceId: priceId,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    features: features,
    ...features,
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
