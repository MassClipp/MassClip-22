import { NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

// VIP/CREATOR PRO WEBHOOK - Only handles Creator Pro subscriptions

const CREATOR_PRO_PRICE_IDS = [process.env.CREATOR_PRO_FIRST, process.env.CREATOR_PRO_REGULAR].filter(Boolean)

const CREATOR_PRO_CONFIG = {
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
}

// FACELESSPRENUER WEBHOOK - Handles Facelessprenuer subscriptions

const FACELESSPRENUER_PRICE_IDS = [process.env.FACELESSPRENUER_FIRST, process.env.FACELESSPRENUER_REGULAR].filter(
  Boolean,
)

const FACELESSPRENUER_CONFIG = {
  plan: "facelessprenuer" as const,
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
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY")
  return new Stripe(key, { apiVersion: "2023-10-16" })
}

async function updateCreatorProMembership(opts: {
  uid: string
  email?: string | null
  priceId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  currentPeriodEnd?: Date | null
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete"
}) {
  const { uid, email, priceId, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd, status } = opts

  console.log(`[VIP WEBHOOK] Updating membership for ${uid}`)
  console.log(`  Status: ${status}`)
  console.log(`  Price ID: ${priceId}`)

  const isActive = status === "active" || status === "trialing"

  const membershipData = {
    uid,
    email: email || null,
    plan: CREATOR_PRO_CONFIG.plan,
    status,
    isActive,
    stripeCustomerId,
    stripeSubscriptionId,
    currentPeriodEnd: currentPeriodEnd || null,
    priceId,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: {
      ...CREATOR_PRO_CONFIG.features,
      isActive,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await adminDb.collection("memberships").doc(uid).set(membershipData, { merge: true })
  console.log(`[VIP WEBHOOK] ✅ Membership updated successfully`)
}

async function updateFacelessprenuerMembership(opts: {
  uid: string
  email?: string | null
  priceId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  currentPeriodEnd?: Date | null
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete"
}) {
  const { uid, email, priceId, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd, status } = opts

  console.log(`[FACELESSPRENUER WEBHOOK] Updating membership for ${uid}`)
  console.log(`  Status: ${status}`)
  console.log(`  Price ID: ${priceId}`)

  const isActive = status === "active" || status === "trialing"

  const membershipData = {
    uid,
    email: email || null,
    plan: FACELESSPRENUER_CONFIG.plan,
    status,
    isActive,
    stripeCustomerId,
    stripeSubscriptionId,
    currentPeriodEnd: currentPeriodEnd || null,
    priceId,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: {
      ...FACELESSPRENUER_CONFIG.features,
      isActive,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await adminDb.collection("memberships").doc(uid).set(membershipData, { merge: true })
  console.log(`[FACELESSPRENUER WEBHOOK] ✅ Membership updated successfully`)
}

export async function POST(request: Request) {
  try {
    console.log("=== VIP/CREATOR PRO WEBHOOK RECEIVED ===")

    const webhookSecret = process.env.FACELESSPRENUER_WEBHOOK || process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 })
    }

    const stripe = getStripe()
    const payload = await request.text()
    const sig = request.headers.get("stripe-signature")

    if (!sig) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret)
      console.log(`[VIP WEBHOOK] Event: ${event.type} (${event.id})`)
    } catch (err: any) {
      console.error(`[VIP WEBHOOK] Signature verification failed: ${err.message}`)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Store event for debugging
    await adminDb.collection("stripeWebhookEvents").add({
      eventType: event.type,
      eventId: event.id,
      receivedAt: FieldValue.serverTimestamp(),
      rawEvent: JSON.parse(payload),
      webhook: "creator-pro",
    })

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const uid = session.metadata?.buyerUid || session.client_reference_id
        const email = session.metadata?.buyerEmail || session.customer_email
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : null
        const customerId = typeof session.customer === "string" ? session.customer : null
        const priceId = session.metadata?.priceId

        if (!uid || !subscriptionId || !customerId || !priceId) {
          console.log("[VIP WEBHOOK] Missing required fields")
          return NextResponse.json({ received: true })
        }

        if (!CREATOR_PRO_PRICE_IDS.includes(priceId)) {
          console.log(`[VIP WEBHOOK] Ignoring non-Creator-Pro price: ${priceId}`)
          return NextResponse.json({ received: true })
        }

        await updateCreatorProMembership({
          uid,
          email,
          priceId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          status: "active",
        })
        break
      }

      case "customer.subscription.created":
      case "invoice.payment_succeeded": {
        let sub: Stripe.Subscription

        if (event.type === "customer.subscription.created") {
          sub = event.data.object as Stripe.Subscription
        } else {
          const invoice = event.data.object as Stripe.Invoice
          const subscriptionId = invoice.subscription

          if (!subscriptionId || typeof subscriptionId !== "string") {
            console.log("[VIP WEBHOOK] No subscription ID in invoice")
            return NextResponse.json({ received: true })
          }

          try {
            sub = await stripe.subscriptions.retrieve(subscriptionId)
          } catch (error) {
            console.error("[VIP WEBHOOK] Failed to retrieve subscription:", error)
            return NextResponse.json({ received: true })
          }
        }

        const uid = sub.metadata?.buyerUid
        const priceId = sub.items?.data?.[0]?.price?.id
        const customerId = typeof sub.customer === "string" ? sub.customer : null
        const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

        if (!uid || !priceId || !customerId) {
          console.log("[VIP WEBHOOK] Missing required fields in subscription")
          return NextResponse.json({ received: true })
        }

        if (!CREATOR_PRO_PRICE_IDS.includes(priceId)) {
          console.log(`[VIP WEBHOOK] Ignoring non-Creator-Pro price: ${priceId}`)
          return NextResponse.json({ received: true })
        }

        let email: string | null = null
        try {
          const cust = await stripe.customers.retrieve(customerId)
          if (!("deleted" in cust)) email = cust.email
        } catch (e) {
          console.log("[VIP WEBHOOK] Could not retrieve customer email")
        }

        await updateCreatorProMembership({
          uid,
          email,
          priceId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          currentPeriodEnd,
          status: sub.status as any,
        })
        break
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        const uid = sub.metadata?.buyerUid
        const priceId = sub.items?.data?.[0]?.price?.id

        if (!uid) {
          return NextResponse.json({ received: true })
        }

        if (!priceId || !CREATOR_PRO_PRICE_IDS.includes(priceId)) {
          console.log(`[VIP WEBHOOK] Ignoring non-Creator-Pro subscription update: ${priceId}`)
          return NextResponse.json({ received: true })
        }

        const membershipRef = adminDb.collection("memberships").doc(uid)
        const membershipDoc = await membershipRef.get()

        if (!membershipDoc.exists) {
          console.log(`[VIP WEBHOOK] Membership doesn't exist for ${uid}, creating it`)
          const customerId = typeof sub.customer === "string" ? sub.customer : null
          const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

          if (customerId) {
            await updateCreatorProMembership({
              uid,
              email: null,
              priceId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: sub.id,
              currentPeriodEnd,
              status: sub.status as any,
            })
          }
          return NextResponse.json({ received: true })
        }

        if (sub.cancel_at_period_end) {
          const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null
          await membershipRef.update({
            status: "canceled",
            isActive: false,
            currentPeriodEnd,
            updatedAt: FieldValue.serverTimestamp(),
          })
          console.log(`[VIP WEBHOOK] Subscription canceled for ${uid}`)
        }
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const uid = sub.metadata?.buyerUid

        if (!uid) {
          return NextResponse.json({ received: true })
        }

        await adminDb.collection("memberships").doc(uid).delete()
        await adminDb.collection("freeUsers").doc(uid).set({
          uid,
          plan: "free",
          downloadsUsed: 0,
          bundlesCreated: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        console.log(`[VIP WEBHOOK] User ${uid} moved to free tier`)
        break
      }

      default:
        console.log(`[VIP WEBHOOK] Unhandled event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[VIP WEBHOOK] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
