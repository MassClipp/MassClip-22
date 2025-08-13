import Stripe from "stripe"
import { adminDb, isFirebaseAdminInitialized } from "@/lib/firebase-admin"
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

async function findUserByEmail(email: string): Promise<string | null> {
  if (!isFirebaseAdminInitialized()) {
    throw new Error("Firebase Admin not initialized")
  }

  console.log(`🔍 [Webhook] Looking up user by email: ${email}`)

  try {
    // Try users collection first
    const usersSnapshot = await adminDb.collection("users").where("email", "==", email).limit(1).get()
    if (!usersSnapshot.empty) {
      const userId = usersSnapshot.docs[0].id
      console.log(`✅ [Webhook] Found user in users collection: ${userId}`)
      return userId
    }

    // Try freeUsers collection as backup
    const freeUsersSnapshot = await adminDb.collection("freeUsers").where("email", "==", email).limit(1).get()
    if (!freeUsersSnapshot.empty) {
      const userId = freeUsersSnapshot.docs[0].data().uid
      console.log(`✅ [Webhook] Found user in freeUsers collection: ${userId}`)
      return userId
    }

    console.log(`❌ [Webhook] User not found with email: ${email}`)
    return null
  } catch (error) {
    console.error(`❌ [Webhook] Error looking up user by email:`, error)
    throw error
  }
}

async function findUserByCustomerId(customerId: string): Promise<string | null> {
  if (!isFirebaseAdminInitialized()) {
    throw new Error("Firebase Admin not initialized")
  }

  console.log(`🔍 [Webhook] Looking up user by Stripe customer ID: ${customerId}`)

  try {
    const memberships = adminDb.collection("memberships")
    const snapshot = await memberships.where("stripeCustomerId", "==", customerId).limit(1).get()
    if (snapshot.empty) {
      console.log(`❌ [Webhook] Could not find user with Stripe Customer ID: ${customerId}`)
      return null
    }
    const userId = snapshot.docs[0].id
    console.log(`✅ [Webhook] Found user by customer ID: ${userId}`)
    return userId
  } catch (error) {
    console.error(`❌ [Webhook] Error looking up user by customer ID:`, error)
    throw error
  }
}

async function setMembership(uid: string, data: object) {
  if (!isFirebaseAdminInitialized()) {
    throw new Error("Firebase Admin not initialized")
  }

  console.log(`💾 [Webhook] Setting membership for user: ${uid}`)
  console.log(`📋 [Webhook] Membership data:`, data)

  try {
    const docRef = adminDb.collection("memberships").doc(uid)
    await docRef.set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    console.log(`✅ [Webhook] Updated membership for user ${uid}`)
  } catch (error) {
    console.error(`❌ [Webhook] Error setting membership:`, error)
    throw error
  }
}

// --- Exported Processing Functions ---

export async function processCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`🔄 [Webhook] Processing checkout.session.completed: ${session.id}`)
  console.log(`📋 [Webhook] Session metadata:`, session.metadata)
  console.log(`📧 [Webhook] Customer email:`, session.customer_email)
  console.log(`🆔 [Webhook] Client reference ID:`, session.client_reference_id)

  // Method 1: Try to get user ID from metadata
  let userId = session.metadata?.buyerUid || session.metadata?.userId

  if (userId) {
    console.log(`✅ [Webhook] Found user ID in metadata: ${userId}`)
  } else {
    console.log(`⚠️ [Webhook] No user ID in metadata, trying other methods`)

    // Method 2: Try client_reference_id
    if (session.client_reference_id) {
      userId = session.client_reference_id
      console.log(`✅ [Webhook] Found user ID in client_reference_id: ${userId}`)
    } else {
      // Method 3: Try to find user by email
      if (session.customer_email) {
        userId = await findUserByEmail(session.customer_email)
        if (userId) {
          console.log(`✅ [Webhook] Found user ID by email lookup: ${userId}`)
        }
      }
    }
  }

  if (!userId) {
    throw new Error(`Could not identify user from checkout session. Session ID: ${session.id}`)
  }

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id

  if (!customerId) {
    throw new Error(`Missing customerId in checkout session. Session ID: ${session.id}`)
  }
  if (!subscriptionId) {
    throw new Error(`Missing subscriptionId in checkout session. Session ID: ${session.id}`)
  }

  console.log(`🔄 [Webhook] Retrieving subscription: ${subscriptionId}`)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const membershipData = {
    uid: userId,
    plan: "creator_pro" as MembershipPlan,
    status: subscription.status as MembershipStatus,
    isActive: subscription.status === "active" || subscription.status === "trialing",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    priceId: subscription.items.data[0]?.price.id,
    features: PRO_FEATURES,
    createdAt: FieldValue.serverTimestamp(),
  }

  await setMembership(userId, membershipData)
  console.log(`✅ [Webhook] Membership created for user: ${userId}`)
}

export async function processSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`🔄 [Webhook] Processing subscription.updated: ${subscription.id}`)

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  let userId = await findUserByCustomerId(customerId)

  if (!userId) {
    // Try to find user by subscription metadata
    const metadata = subscription.metadata
    userId = metadata?.buyerUid || metadata?.userId

    if (userId) {
      console.log(`✅ [Webhook] Found user ID in subscription metadata: ${userId}`)
    } else {
      throw new Error(`User not found for customer ID: ${customerId}`)
    }
  }

  const membershipData = {
    status: subscription.status as MembershipStatus,
    isActive: subscription.status === "active" || subscription.status === "trialing",
    priceId: subscription.items.data[0]?.price.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  }

  await setMembership(userId, membershipData)
  console.log(`✅ [Webhook] Subscription updated for user: ${userId}`)
}

export async function processSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`🔄 [Webhook] Processing subscription.deleted: ${subscription.id}`)

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  let userId = await findUserByCustomerId(customerId)

  if (!userId) {
    // Try to find user by subscription metadata
    const metadata = subscription.metadata
    userId = metadata?.buyerUid || metadata?.userId

    if (userId) {
      console.log(`✅ [Webhook] Found user ID in subscription metadata: ${userId}`)
    } else {
      console.log(`⚠️ [Webhook] User not found for deleted subscription. Customer ID: ${customerId}`)
      return
    }
  }

  const membershipData = {
    plan: "free" as MembershipPlan,
    status: "canceled" as MembershipStatus,
    isActive: false,
    features: FREE_FEATURES,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    priceId: null,
  }

  await setMembership(userId, membershipData)
  console.log(`✅ [Webhook] Subscription canceled for user: ${userId}`)
}

export async function processPaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`🔄 [Webhook] Processing paymentIntent.succeeded: ${paymentIntent.id}`)

  const { buyerUid, productType, productId, creatorId } = paymentIntent.metadata

  if (!buyerUid || !productType || !productId || !creatorId) {
    console.error("❌ [Webhook] Missing required metadata in paymentIntent.succeeded event.", {
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata,
    })
    throw new Error("Missing required metadata in paymentIntent.succeeded event.")
  }

  const purchaseRef = adminDb.collection("purchases").doc(paymentIntent.id)
  const purchaseDoc = await purchaseRef.get()

  if (purchaseDoc.exists) {
    console.log(`ℹ️ [Webhook] Purchase with paymentIntentId ${paymentIntent.id} already processed.`)
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
  console.log(`✅ [Webhook] Purchase record created for paymentIntentId: ${paymentIntent.id}`)
}
