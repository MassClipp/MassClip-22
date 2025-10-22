import { NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

type DebugTrace = string[]

// Plan configuration - single source of truth
const PLAN_CONFIGS = {
  // Starter Plan
  starter: {
    plan: "starter" as const,
    features: {
      unlimitedDownloads: false,
      premiumContent: false,
      noWatermark: false,
      prioritySupport: false,
      platformFeePercentage: 20,
      maxVideosPerBundle: 15,
      maxBundles: 5,
      maxFolders: 3,
      isActive: true,
    },
  },
  // Creator Pro (VIP)
  creator_pro: {
    plan: "creator_pro" as const,
    features: {
      unlimitedDownloads: true,
      premiumContent: true,
      noWatermark: true,
      prioritySupport: true,
      platformFeePercentage: 10,
      maxVideosPerBundle: null,
      maxBundles: null,
      maxFolders: null,
      isActive: true,
    },
  },
}

// Price ID to Plan mapping - add your price IDs here
const PRICE_ID_TO_PLAN: Record<string, keyof typeof PLAN_CONFIGS> = {
  // Starter Plan price IDs
  price_1SKKFPDheyb0pkWFBT6lf7V7: "starter",

  // Creator Pro price IDs - add your VIP price IDs here
  // price_YOUR_VIP_PRICE_ID: "creator_pro",
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY")
  return new Stripe(key, { apiVersion: "2023-10-16" })
}

function firstNonEmpty(...vals: Array<string | null | undefined>): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim().length > 0) return v
  }
  return null
}

// Single function to update membership - always does COMPLETE updates
async function updateMembership(opts: {
  uid: string
  email?: string | null
  priceId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  currentPeriodEnd?: Date | null
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete"
  source: string
  debugTrace: DebugTrace
}) {
  const { uid, email, priceId, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd, status, source, debugTrace } =
    opts

  debugTrace.push(`[${source}] updateMembership called for uid: ${uid}`)
  debugTrace.push(`  priceId: ${priceId}`)
  debugTrace.push(`  status: ${status}`)
  debugTrace.push(`  stripeCustomerId: ${stripeCustomerId}`)
  debugTrace.push(`  stripeSubscriptionId: ${stripeSubscriptionId}`)

  // Look up plan from price ID
  const planKey = PRICE_ID_TO_PLAN[priceId]
  if (!planKey) {
    debugTrace.push(`❌ ERROR: Unknown price ID: ${priceId}`)
    debugTrace.push(`  Available price IDs: ${Object.keys(PRICE_ID_TO_PLAN).join(", ")}`)
    throw new Error(`Unknown price ID: ${priceId}`)
  }

  const planConfig = PLAN_CONFIGS[planKey]
  debugTrace.push(`✅ Matched price ID to plan: ${planKey}`)

  // Determine if subscription is active
  const isActive = status === "active" || status === "trialing"

  // Build complete membership document
  const membershipData = {
    uid,
    email: email || null,
    plan: planConfig.plan,
    status,
    isActive,
    stripeCustomerId,
    stripeSubscriptionId,
    currentPeriodEnd: currentPeriodEnd || null,
    priceId,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: {
      ...planConfig.features,
      isActive, // Override with actual subscription status
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  debugTrace.push(`Writing to Firestore:`)
  debugTrace.push(`  plan: ${membershipData.plan}`)
  debugTrace.push(`  status: ${membershipData.status}`)
  debugTrace.push(`  isActive: ${membershipData.isActive}`)
  debugTrace.push(`  features.isActive: ${membershipData.features.isActive}`)
  debugTrace.push(`  features.maxBundles: ${membershipData.features.maxBundles}`)
  debugTrace.push(`  features.maxFolders: ${membershipData.features.maxFolders}`)
  debugTrace.push(`  features.platformFeePercentage: ${membershipData.features.platformFeePercentage}`)

  // ALWAYS use .set() to do complete replacement (never partial updates)
  await adminDb.collection("memberships").doc(uid).set(membershipData)

  debugTrace.push(`✅ Membership updated successfully in Firestore`)
}

// Update membership status only (for cancellations)
async function updateMembershipStatus(opts: {
  uid: string
  status: "canceled"
  currentPeriodEnd?: Date | null
  source: string
  debugTrace: DebugTrace
}) {
  const { uid, status, currentPeriodEnd, source, debugTrace } = opts

  debugTrace.push(`[${source}] updateMembershipStatus called for uid: ${uid}`)
  debugTrace.push(`  status: ${status}`)

  // Get existing membership to preserve plan and features
  const existingDoc = await adminDb.collection("memberships").doc(uid).get()
  if (!existingDoc.exists) {
    debugTrace.push(`⚠️ No existing membership found for uid: ${uid}`)
    return
  }

  const existingData = existingDoc.data()
  debugTrace.push(`  existing plan: ${existingData?.plan}`)

  // Update only status and period end, preserve everything else
  await adminDb
    .collection("memberships")
    .doc(uid)
    .update({
      status,
      isActive: false,
      currentPeriodEnd: currentPeriodEnd || null,
      updatedAt: FieldValue.serverTimestamp(),
    })

  debugTrace.push(`✅ Membership status updated to: ${status}`)
}

// Move user to free tier
async function moveToFreeUsers(uid: string, debugTrace: DebugTrace) {
  debugTrace.push(`Moving user ${uid} to freeUsers collection`)

  try {
    // Remove from memberships
    await adminDb.collection("memberships").doc(uid).delete()
    debugTrace.push(`  Removed from memberships collection`)

    // Add to freeUsers
    await adminDb.collection("freeUsers").doc(uid).set({
      uid,
      plan: "free",
      downloadsUsed: 0,
      bundlesCreated: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    debugTrace.push(`  Added to freeUsers collection`)
  } catch (error: any) {
    debugTrace.push(`❌ Error moving to freeUsers: ${error.message}`)
    throw error
  }
}

// Extract user ID from various sources
function extractUid(metadata: any, clientReferenceId?: string | null): string | null {
  return firstNonEmpty(metadata?.buyerUid, metadata?.firebaseUid, metadata?.userId, clientReferenceId)
}

// Event Handlers

async function handleCheckoutCompleted(stripe: Stripe, event: Stripe.Event, debugTrace: DebugTrace) {
  const session = event.data.object as Stripe.Checkout.Session
  debugTrace.push(`\n=== checkout.session.completed: ${session.id} ===`)

  const uid = extractUid(session.metadata, session.client_reference_id)
  const email = firstNonEmpty(session.metadata?.buyerEmail, session.customer_email)
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
  const priceId = session.metadata?.priceId

  if (!uid) {
    debugTrace.push("❌ No uid found in session")
    return NextResponse.json({ error: "No user ID", debugTrace }, { status: 400 })
  }

  // Handle download purchases (not subscriptions)
  if (session.metadata?.source === "dashboard_download_purchase") {
    debugTrace.push("This is a download purchase, not a subscription")
    // Handle download purchase logic here if needed
    return NextResponse.json({ received: true, debugTrace })
  }

  if (!subscriptionId || !customerId || !priceId) {
    debugTrace.push("⚠️ Missing required fields for subscription")
    return NextResponse.json({ received: true, debugTrace })
  }

  await updateMembership({
    uid,
    email,
    priceId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    status: "active",
    source: "checkout.session.completed",
    debugTrace,
  })

  return NextResponse.json({ received: true, debugTrace })
}

async function handleSubscriptionCreated(stripe: Stripe, event: Stripe.Event, debugTrace: DebugTrace) {
  const sub = event.data.object as Stripe.Subscription
  debugTrace.push(`\n=== customer.subscription.created: ${sub.id} ===`)

  const uid = extractUid(sub.metadata)
  const priceId = sub.items?.data?.[0]?.price?.id
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id
  const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

  if (!uid) {
    debugTrace.push("❌ No uid found in subscription metadata")
    return NextResponse.json({ error: "No user ID", debugTrace }, { status: 400 })
  }

  if (!priceId || !customerId) {
    debugTrace.push("⚠️ Missing priceId or customerId")
    return NextResponse.json({ received: true, debugTrace })
  }

  // Get customer email
  let email: string | null = null
  try {
    const cust = await stripe.customers.retrieve(customerId)
    if (!("deleted" in cust)) email = cust.email
  } catch (e: any) {
    debugTrace.push(`Could not retrieve customer email: ${e.message}`)
  }

  await updateMembership({
    uid,
    email,
    priceId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    currentPeriodEnd,
    status: sub.status as any,
    source: "customer.subscription.created",
    debugTrace,
  })

  return NextResponse.json({ received: true, debugTrace })
}

async function handleSubscriptionUpdated(stripe: Stripe, event: Stripe.Event, debugTrace: DebugTrace) {
  const sub = event.data.object as Stripe.Subscription
  debugTrace.push(`\n=== customer.subscription.updated: ${sub.id} ===`)
  debugTrace.push(`  status: ${sub.status}`)
  debugTrace.push(`  cancel_at_period_end: ${sub.cancel_at_period_end}`)

  const uid = extractUid(sub.metadata)
  if (!uid) {
    debugTrace.push("❌ No uid found in subscription metadata")
    return NextResponse.json({ error: "No user ID", debugTrace }, { status: 400 })
  }

  // Only handle cancellations
  if (sub.cancel_at_period_end) {
    const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

    await updateMembershipStatus({
      uid,
      status: "canceled",
      currentPeriodEnd,
      source: "customer.subscription.updated",
      debugTrace,
    })
  } else {
    debugTrace.push("No action needed - subscription not being canceled")
  }

  return NextResponse.json({ received: true, debugTrace })
}

async function handleSubscriptionDeleted(stripe: Stripe, event: Stripe.Event, debugTrace: DebugTrace) {
  const sub = event.data.object as Stripe.Subscription
  debugTrace.push(`\n=== customer.subscription.deleted: ${sub.id} ===`)

  const uid = extractUid(sub.metadata)
  if (!uid) {
    debugTrace.push("❌ No uid found in subscription metadata")
    return NextResponse.json({ error: "No user ID", debugTrace }, { status: 400 })
  }

  await moveToFreeUsers(uid, debugTrace)

  return NextResponse.json({ received: true, debugTrace })
}

async function handleInvoicePaid(stripe: Stripe, event: Stripe.Event, debugTrace: DebugTrace) {
  const invoice = event.data.object as Stripe.Invoice
  debugTrace.push(`\n=== invoice.payment_succeeded: ${invoice.id} ===`)

  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id

  if (!subscriptionId) {
    debugTrace.push("No subscription ID - skipping")
    return NextResponse.json({ received: true, debugTrace })
  }

  // Get subscription details
  let uid: string | null = null
  let priceId: string | null = null
  let currentPeriodEnd: Date | null = null
  let email: string | null = null

  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId)
    uid = extractUid(sub.metadata)
    priceId = sub.items?.data?.[0]?.price?.id ?? null
    currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

    if (customerId) {
      const cust = await stripe.customers.retrieve(customerId)
      if (!("deleted" in cust)) email = cust.email
    }
  } catch (e: any) {
    debugTrace.push(`❌ Error retrieving subscription: ${e.message}`)
    return NextResponse.json({ received: true, debugTrace })
  }

  if (!uid || !priceId || !customerId) {
    debugTrace.push("⚠️ Missing required fields")
    return NextResponse.json({ received: true, debugTrace })
  }

  await updateMembership({
    uid,
    email,
    priceId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    currentPeriodEnd,
    status: "active",
    source: "invoice.payment_succeeded",
    debugTrace,
  })

  return NextResponse.json({ received: true, debugTrace })
}

// Main webhook handler
export async function POST(request: Request) {
  const debugTrace: DebugTrace = []

  try {
    debugTrace.push("=== WEBHOOK RECEIVED ===")
    debugTrace.push(`Time: ${new Date().toISOString()}`)

    // Verify environment
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      debugTrace.push("❌ Missing STRIPE_WEBHOOK_SECRET")
      return NextResponse.json({ error: "Server configuration error", debugTrace }, { status: 500 })
    }

    // Verify Firebase
    try {
      await adminDb.collection("test").limit(1).get()
      debugTrace.push("✅ Firebase connected")
    } catch (error: any) {
      debugTrace.push(`❌ Firebase error: ${error.message}`)
      return NextResponse.json({ error: "Firestore not initialized", debugTrace }, { status: 500 })
    }

    const stripe = getStripe()

    // Verify webhook signature
    const payload = await request.text()
    const sig = request.headers.get("stripe-signature")
    if (!sig) {
      debugTrace.push("❌ Missing stripe-signature header")
      return NextResponse.json({ error: "Missing signature", debugTrace }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET)
      debugTrace.push(`✅ Signature verified`)
      debugTrace.push(`Event ID: ${event.id}`)
      debugTrace.push(`Event Type: ${event.type}`)
    } catch (err: any) {
      debugTrace.push(`❌ Signature verification failed: ${err.message}`)
      return NextResponse.json({ error: "Invalid signature", debugTrace }, { status: 400 })
    }

    // Store raw event for debugging
    try {
      await adminDb.collection("stripeWebhookEvents").add({
        eventType: event.type,
        eventId: event.id,
        receivedAt: FieldValue.serverTimestamp(),
        rawEvent: JSON.parse(payload),
      })
      debugTrace.push("✅ Event stored in stripeWebhookEvents collection")
    } catch (e: any) {
      debugTrace.push(`⚠️ Could not store event: ${e.message}`)
    }

    // Route to appropriate handler
    switch (event.type) {
      case "checkout.session.completed":
        return await handleCheckoutCompleted(stripe, event, debugTrace)
      case "customer.subscription.created":
        return await handleSubscriptionCreated(stripe, event, debugTrace)
      case "customer.subscription.updated":
        return await handleSubscriptionUpdated(stripe, event, debugTrace)
      case "customer.subscription.deleted":
        return await handleSubscriptionDeleted(stripe, event, debugTrace)
      case "invoice.payment_succeeded":
        return await handleInvoicePaid(stripe, event, debugTrace)
      default:
        debugTrace.push(`ℹ️ Unhandled event type: ${event.type}`)
        return NextResponse.json({ received: true, debugTrace })
    }
  } catch (error: any) {
    console.error("Webhook error:", error)
    debugTrace.push(`❌ FATAL ERROR: ${error.message}`)
    debugTrace.push(`Stack: ${error.stack}`)
    return NextResponse.json({ error: error.message, debugTrace }, { status: 500 })
  }
}
