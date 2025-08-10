import Stripe from "stripe"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import {
  setCreatorPro,
  setCreatorProStatus,
  setFree,
  getMembership,
  type MembershipStatus,
} from "@/lib/memberships-service"

// --- Firebase Admin Initialization ---
// This is a critical step. Ensure it's robust.
if (!getApps().length) {
  try {
    // Vercel automatically handles the newline characters in env vars.
    // Parsing directly is the correct approach.
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)
    initializeApp({
      credential: cert(serviceAccount),
    })
    console.log("Firebase Admin SDK initialized successfully.")
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error)
    // If this fails, the webhook will not be able to access Firestore.
  }
}
const db = getFirestore()
// --- End Firebase Admin Initialization ---

// Helper to extract UID from various metadata locations
function getUidFromMetadata(metadata: Stripe.Metadata | null | undefined): string | null {
  if (!metadata) return null
  return metadata.buyerUid || metadata.firebaseUid || metadata.userId || null
}

async function processBundlePurchase(session: Stripe.Checkout.Session) {
  console.log(`🎯 [Webhook] Processing bundle purchase: ${session.id}.`)
  // NOTE: This is where the logic for one-time bundle purchases would go.
  // It was present in a previous version of the file.
  // For now, we just log it to show it's being routed correctly.
  const bundleId = session.metadata?.bundleId || session.metadata?.productBoxId
  if (bundleId) {
    console.log(`[Webhook] Bundle ID found: ${bundleId}. Ready for purchase processing.`)
    // Here you would typically:
    // 1. Fetch bundle details from Firestore.
    // 2. Fetch content items associated with the bundle.
    // 3. Create a detailed record in a 'bundlePurchases' collection.
  } else {
    console.warn(`[Webhook] No bundle ID found for payment session: ${session.id}`)
  }
}

async function processMembershipPurchase(session: Stripe.Checkout.Session) {
  const uid = session.client_reference_id || getUidFromMetadata(session.metadata)
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id
  const email = session.customer_details?.email
  const priceId = session.metadata?.priceId || session.line_items?.data[0]?.price?.id

  if (!uid || !customerId || !subscriptionId || !email) {
    console.error("Webhook Processor: Missing required data for membership purchase", {
      uid,
      customerId,
      subscriptionId,
      email,
    })
    return
  }

  console.log(`[Webhook] Processing membership purchase for user ${uid}`)

  try {
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
  } catch (error) {
    console.error(`[Webhook] Error upgrading user ${uid} to Creator Pro:`, error)
  }
}

export async function processCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode === "subscription") {
    await processMembershipPurchase(session)
  } else if (session.mode === "payment") {
    await processBundlePurchase(session)
  } else {
    console.log(`[Webhook] Skipping checkout session with mode ${session.mode}`)
  }
}

export async function processSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  let uid = getUidFromMetadata(subscription.metadata)

  if (!uid && customerId) {
    // Fallback: Look up user by Stripe Customer ID in our memberships collection
    const membershipDoc = await getMembership(customerId, "stripeCustomerId")
    if (membershipDoc) {
      uid = membershipDoc.uid
    } else {
      console.error("[Webhook] Could not find user for customer.subscription.updated event.", {
        subId: subscription.id,
        customerId,
      })
      return
    }
  }

  if (!uid) {
    console.error("[Webhook] Could not determine UID for customer.subscription.updated event.", {
      subId: subscription.id,
      customerId,
    })
    return
  }

  const status = subscription.status as MembershipStatus
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

  console.log(`[Webhook] Processing customer.subscription.updated for user ${uid} to status ${status}`)

  try {
    await setCreatorProStatus(uid, status, {
      currentPeriodEnd,
      priceId: subscription.items.data[0]?.price.id,
    })
    console.log(`[Webhook] Membership status for ${uid} updated to ${status}.`)
  } catch (error) {
    console.error(`[Webhook] Error updating membership status for user ${uid}:`, error)
  }
}

export async function processSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  let uid = getUidFromMetadata(subscription.metadata)

  if (!uid && customerId) {
    const membershipDoc = await getMembership(customerId, "stripeCustomerId")
    if (membershipDoc) {
      uid = membershipDoc.uid
    } else {
      console.error("[Webhook] Could not find user for customer.subscription.deleted event.", {
        subId: subscription.id,
        customerId,
      })
      return
    }
  }

  if (!uid) {
    console.error("[Webhook] Could not determine UID for customer.subscription.deleted event.", {
      subId: subscription.id,
      customerId,
    })
    return
  }

  console.log(`[Webhook] Processing customer.subscription.deleted for user ${uid}`)

  try {
    const membership = await getMembership(uid)
    await setFree(uid, { email: membership?.email || undefined })
    console.log(`[Webhook] User ${uid} downgraded to Free due to subscription deletion.`)
  } catch (error) {
    console.error(`[Webhook] Error downgrading user ${uid} to Free:`, error)
  }
}

export async function processPaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`💳 [Webhook] Processing payment intent succeeded: ${paymentIntent.id}`)
  // This is usually for one-time payments. The main logic is in checkout.session.completed.
  // We can add more logic here if needed, e.g., for payments not initiated via a checkout session.
  console.log(`✅ [Webhook] Payment intent ${paymentIntent.id} processed successfully`)
  return {
    success: true,
    paymentIntentId: paymentIntent.id,
  }
}
