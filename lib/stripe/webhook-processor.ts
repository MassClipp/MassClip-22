import Stripe from "stripe"
import { getApps, cert } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

// --- Types (consolidated from memberships-service) ---
export type MembershipPlan = "free" | "creator_pro"
export type MembershipStatus = "active" | "inactive" | "canceled" | "past_due" | "trialing"

export interface MembershipFeatures \{
  unlimitedDownloads: boolean
  premiumContent: boolean
  noWatermark: boolean
  prioritySupport: boolean
  platformFeePercentage: number
  maxVideosPerBundle: number | null
  maxBundles: number | null
\}
\
const FREE_FEATURES: MembershipFeatures = \
{
  unlimitedDownloads: false,\
  premiumContent: false,\
  noWatermark: false,\
  prioritySupport: false,\
  platformFeePercentage: 20,\
  maxVideosPerBundle: 10,\
  maxBundles: 2,
\
}
\
const PRO_FEATURES: MembershipFeatures = \
{
  unlimitedDownloads: true,\
  premiumContent: true,\
  noWatermark: true,\
  prioritySupport: true,\
  platformFeePercentage: 10,\
  maxVideosPerBundle: null,\
  maxBundles: null,
\
}

// --- Firebase Admin Initialization (Lazy and Resilient) ---
let db: Firestore | null = null

function getDb()
\
{
  if (db)
  \
  return db
  \

  if (!getApps().length)
  \
  try
  \
  {
    // Only parse the key if we absolutely need to initialize
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (!serviceAccountKey)
    \
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.")
    \
    const serviceAccount = JSON.parse(serviceAccountKey)
    \
      initializeApp(\
    credential: cert(serviceAccount),\
    \
    )
      console.log("Firebase Admin SDK initialized successfully.")\
    \
  }
  catch (error: any) \
  console.error("Failed to initialize Firebase Admin SDK:", error.message)
  throw new Error("Firebase Admin SDK initialization failed.")
  \
  \
  db = getFirestore()
  return db
  \
}

// --- Firestore Logic (consolidated from memberships-service) ---
async function setCreatorPro(
  uid: string,\
  params: \{\
    email?: string\
    stripeCustomerId: string\
    stripeSubscriptionId: string\
    currentPeriodEnd?: Date\
    priceId?: string\
    status?: Exclude<MembershipStatus, "inactive\">
\},
) \
{
  const now = new Date()
  const membershipsCol = getDb().collection("memberships")
  await membershipsCol.doc(uid).set(\
    \{
      uid,
      email: params.email,
      plan: "creator_pro",
      status: params.status ?? "active",
      isActive: (params.status ?? "active") === "active" || (params.status ?? "active") === "trialing",
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      currentPeriodEnd: params.currentPeriodEnd,
      priceId: params.priceId,\
      features: \{ ...PRO_FEATURES \},\
      updatedAt: now,\
    \},\
    \{ merge: true \},
  )
  \
}

async function setCreatorProStatus(
  uid: string,
  status: MembershipStatus,
  updates?: \{ currentPeriodEnd?: Date;
priceId?: string
\},
) \
{
  const now = new Date()
  await getDb()
    .collection("memberships")
    .doc(uid)
    .set(
      \{
        status,
        isActive: status === "active" || status === "trialing",
        updatedAt: now,
        ...updates,
      \},
      \{ merge: true \},
    )
  \
}

async function setFree(uid: string, opts?: \{ email?: string \})
\
{
  const now = new Date()
  await getDb()
    .collection("memberships")
    .doc(uid)
    .set(
      \{
        uid,
        email: opts?.email,
        plan: "free",
        status: "active",
        isActive: true,
        features: \{ ...FREE_FEATURES \},
        updatedAt: now,
      \},
      \{ merge: true \},
    )
  \
}

// --- Webhook Processing Logic ---

function getUidFromMetadata(metadata: Stripe.Metadata | null | undefined): string | null
\
{
  if (!metadata) return null
  return metadata.buyerUid || metadata.firebaseUid || metadata.userId || null
  \
}

async function processMembershipPurchase(session: Stripe.Checkout.Session)
\
{
  const uid = session.client_reference_id || getUidFromMetadata(session.metadata)
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id
  const email = session.customer_details?.email
  const priceId = session.metadata?.priceId || session.line_items?.data[0]?.price?.id

  if (!uid || !customerId || !subscriptionId || !email)
  \
  console.error("Webhook: Missing required data for membership purchase", \{ uid, customerId, subscriptionId, email \})
  return
  \

  console.log(`Webhook: Processing membership purchase for user $\{uid\}`)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

  await setCreatorPro(uid, \{
    email,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    priceId: priceId || undefined,
    currentPeriodEnd: currentPeriodEnd,
    status: "active",
  \})
  console.log(`Webhook: User $\{uid\} successfully upgraded to Creator Pro.`)
  \
}

export async function processCheckoutSessionCompleted(session: Stripe.Checkout.Session)
\
{
  getDb() // Ensure DB is initialized
  if (session.mode === "subscription")
  \
  await processMembershipPurchase(session)
  \
  else \
  console.log(`Webhook: Skipping checkout session with mode $\{session.mode\}`)
  \
  \
}

export async function processSubscriptionUpdated(subscription: Stripe.Subscription)
\
{
  getDb() // Ensure DB is initialized
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  const membershipsCol = getDb().collection("memberships")
  const snapshot = await membershipsCol.where("stripeCustomerId", "==", customerId).limit(1).get()

  if (snapshot.empty)
  \
  console.error("[Webhook] Could not find user for subscription update.", \{ customerId \})
  return
  \
  const uid = snapshot.docs[0].id
  const status = subscription.status as MembershipStatus
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

  console.log(`Webhook: Updating subscription for user $\{uid\} to status $\{status\}`)
  await setCreatorProStatus(uid, status, \{
    currentPeriodEnd,
    priceId: subscription.items.data[0]?.price.id,
  \})
  \
}

export async function processSubscriptionDeleted(subscription: Stripe.Subscription)
\
{
  getDb() // Ensure DB is initialized
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  const membershipsCol = getDb().collection("memberships")
  const snapshot = await membershipsCol.where("stripeCustomerId", "==", customerId).limit(1).get()

  if (snapshot.empty)
  \
  console.error("[Webhook] Could not find user for subscription deletion.", \{ customerId \})
  return
  \
  const uid = snapshot.docs[0].id
  const userMembership = snapshot.docs[0].data()

  console.log(`Webhook: Deleting subscription for user $\{uid\}`)
  await setFree(uid, \{ email: userMembership?.email \})
  \
}

export async function processPaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent)
\
{
  getDb() // Ensure DB is initialized
  console.log(`Webhook: Acknowledging payment_intent.succeeded: $\{paymentIntent.id\}`)
  \
}
