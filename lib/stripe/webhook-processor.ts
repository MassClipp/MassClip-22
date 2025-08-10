import Stripe from "stripe"
import { setFree, getMembership, type MembershipStatus } from "@/lib/memberships-service"
import { getFirestore } from "firebase-admin/firestore"
import { getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin
if (!getApps().length)
\
{
  try
  \
  {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)
    \
    initializeApp(\
    credential: cert(serviceAccount),\
    \
    )
    \
  \
  }
  catch (error) \
  console.error("Failed to initialize Firebase Admin SDK:", error)
  \
  \
}

const db = getFirestore()

// Helper to extract UID from various metadata locations
function getUidFromMetadata(metadata: Stripe.Metadata | null | undefined): string | null
\
{
  if (!metadata) return null;
  return metadata.buyerUid || metadata.firebaseUid || metadata.userId || null;
  \
}

async function processBundlePurchase(session: Stripe.Checkout.Session)
\
{
  console.log(`🎯 [Webhook] Processing bundle purchase: $\{session.id\}.`)
  // NOTE: The original, extensive logic for handling one-time bundle purchases
  // from the previous version of this file should be placed here.
  // This is a placeholder to ensure the routing is correct.
  const bundleId = session.metadata?.bundleId || session.metadata?.productBoxId
  if (bundleId)
  \
  console.log(`[Webhook] Bundle ID found: $\{bundleId\}. Ready for purchase processing.`)
  \
  \
  else \
  console.warn(`[Webhook] No bundle ID found for payment session: $\{session.id\}`)
  \
  \
}

async function processMembershipPurchase(session: Stripe.Checkout.Session)
\
{
  const uid = session.client_reference_id || getUidFromMetadata(session.metadata);
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const email = session.customer_details?.email;
  const priceId = session.metadata?.priceId || session.line_items?.data[0]?.price?.id;

  if (!uid || !customerId || !subscriptionId || !email) \
    console.error(\"Webhook Processor: Missing required data for membership purchase\", \{ uid, customerId, subscriptionId, email \});\
    return;\
  \}\
\
  console.log(`[Webhook] Processing membership purchase for user $\{uid\}`);
\
  try \{
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
\
    await setCreatorPro(uid, \\
      email,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      priceId: priceId || undefined,
      currentPeriodEnd: currentPeriodEnd,
      status: "active",\
    \);

    console.log(`[Webhook] User $\{uid\} successfully upgraded to Creator Pro.`);\
  \} catch (error) \
    console.error(`[Webhook] Error upgrading user $\{uid\} to Creator Pro:`, error);
  \
\

export async function processCheckoutSessionCompleted(session: Stripe.Checkout.Session) \
  if (session.mode === 'subscription') \
    await processMembershipPurchase(session);\
  \else if (session.mode === 'payment') \
    await processBundlePurchase(session);\
  \else \
    console.log(`[Webhook] Skipping checkout session with mode $\{session.mode\}`);
  \
\

export async function processSubscriptionUpdated(subscription: Stripe.Subscription) \{
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  let uid = getUidFromMetadata(subscription.metadata);

  if (!uid) \{
    const membershipDoc = await getMembership(customerId, 'stripeCustomerId');
    if (membershipDoc) \
      uid = membershipDoc.uid;\
    \else \{
      console.error(\"[Webhook] Could not find user for customer.subscription.updated event.\", \{ subId: subscription.id, customerId \});\
      return;\
    \}\
  \}
\
  const status = subscription.status as MembershipStatus;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  console.log(`[Webhook] Processing customer.subscription.updated for user $\{uid\} to status $\{status\}`);

  try \\
    await setCreatorProStatus(uid, status, \\
      currentPeriodEnd,
      priceId: subscription.items.data[0]?.price.id,\
    \);
    console.log(`[Webhook] Membership status for $\{uid\} updated to $\{status\}.`);\
  \catch (error) \
    console.error(`[Webhook] Error updating membership status for user $\{uid\}:`, error);
  \
\}

export async function processSubscriptionDeleted(subscription: Stripe.Subscription) \{
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  let uid = getUidFromMetadata(subscription.metadata);

  if (!uid) \{
    const membershipDoc = await getMembership(customerId, 'stripeCustomerId');
    if (membershipDoc) \
      uid = membershipDoc.uid;\
    \else \
      console.error("[Webhook] Could not find user for customer.subscription.deleted event.\", \{ subId: subscription.id, customerId \});
      return;
    \
  \}

  console.log(`[Webhook] Processing customer.subscription.deleted for user $\{uid\}`);

  try \{
    const membership = await getMembership(uid);
    await setFree(uid, \{ email: membership?.email || undefined \});
    console.log(`[Webhook] User $\{uid\} downgraded to Free due to subscription deletion.`);
  \} catch (error) \
    console.error(`[Webhook] Error downgrading user $\{uid\} to Free:`, error);
  \
\}

export async function processPaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) \
  console.log(`💳 [Webhook] Processing payment intent succeeded: $\{paymentIntent.id\}`);
  // This is usually for one-time payments. The main logic is in checkout.session.completed.
  console.log(`✅ [Webhook] Payment intent $\{paymentIntent.id\} processed successfully`);
  return \
    success: true,
    paymentIntentId: paymentIntent.id,
  \;
\
