import { NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const FACELESS_PRO_PRICE_IDS = [
  process.env.FACELESS_PRO_FIRST,
  "price_1SQBMvDheyb0pkWFPGz7vke7", // Updated to new test price ID
  "price_1SPRLKDheyb0pkWFnRvP15AO", // Actual Stripe price ID from webhook
].filter(Boolean)

console.log("[v0] Faceless Pro webhook initialized with price IDs:", FACELESS_PRO_PRICE_IDS)

const FACELESS_PRO_PLAN_CONFIG = {
  plan: "faceless_pro" as const,
  features: {
    unlimitedDownloads: false,
    premiumContent: false,
    noWatermark: false,
    prioritySupport: false,
    platformFeePercentage: 10,
    maxVideosPerBundle: 999999,
    maxBundles: 999999,
    maxFolders: 999999,
    isActive: true,
  },
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY")
  return new Stripe(key, { apiVersion: "2023-10-16" })
}

async function updateFacelessProMembership(opts: {
  uid: string
  email?: string | null
  priceId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  currentPeriodEnd?: Date | null
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete"
}) {
  const { uid, email, priceId, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd, status } = opts

  console.log(`[FACELESS PRO WEBHOOK] Updating membership for ${uid}`)
  console.log(`  Status: ${status}`)
  console.log(`  Price ID: ${priceId}`)

  const isActive = status === "active" || status === "trialing"

  const membershipData = {
    uid,
    email: email || null,
    plan: FACELESS_PRO_PLAN_CONFIG.plan,
    status,
    isActive,
    stripeCustomerId,
    stripeSubscriptionId,
    currentPeriodEnd: currentPeriodEnd || null,
    priceId,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: {
      ...FACELESS_PRO_PLAN_CONFIG.features,
      isActive,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await adminDb.collection("memberships").doc(uid).set(membershipData, { merge: true })
  console.log(`[FACELESS PRO WEBHOOK] ✅ Membership updated successfully`)
}

export async function POST(request: Request) {
  try {
    console.log("=== FACELESS PRO PLAN WEBHOOK RECEIVED ===")

    const webhookSecret = process.env.FACELESS_PRO_WEBHOOK

    if (!webhookSecret) {
      return NextResponse.json({ error: "Missing webhook secret (FACELESS_PRO_WEBHOOK)" }, { status: 500 })
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
      console.log(`[FACELESS PRO WEBHOOK] Event: ${event.type} (${event.id})`)
    } catch (err: any) {
      console.error(`[FACELESS PRO WEBHOOK] Signature verification failed: ${err.message}`)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Store event for debugging
    await adminDb.collection("stripeWebhookEvents").add({
      eventType: event.type,
      eventId: event.id,
      receivedAt: FieldValue.serverTimestamp(),
      rawEvent: JSON.parse(payload),
      webhook: "faceless-pro-plan",
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
          console.log("[FACELESS PRO WEBHOOK] Missing required fields")
          return NextResponse.json({ received: true })
        }

        if (!FACELESS_PRO_PRICE_IDS.includes(priceId)) {
          console.log(`[FACELESS PRO WEBHOOK] Ignoring non-Faceless Pro price: ${priceId}`)
          return NextResponse.json({ received: true })
        }

        await updateFacelessProMembership({
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
            console.log("[FACELESS PRO WEBHOOK] No subscription ID in invoice")
            return NextResponse.json({ received: true })
          }

          try {
            sub = await stripe.subscriptions.retrieve(subscriptionId)
          } catch (error) {
            console.error("[FACELESS PRO WEBHOOK] Failed to retrieve subscription:", error)
            return NextResponse.json({ received: true })
          }
        }

        const uid = sub.metadata?.buyerUid
        const priceId = sub.items?.data?.[0]?.price?.id
        const customerId = typeof sub.customer === "string" ? sub.customer : null
        const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

        if (!uid || !priceId || !customerId) {
          console.log("[FACELESS PRO WEBHOOK] Missing required fields in subscription")
          return NextResponse.json({ received: true })
        }

        if (!FACELESS_PRO_PRICE_IDS.includes(priceId)) {
          console.log(`[FACELESS PRO WEBHOOK] Ignoring non-Faceless Pro price: ${priceId}`)
          return NextResponse.json({ received: true })
        }

        let email: string | null = null
        try {
          const cust = await stripe.customers.retrieve(customerId)
          if (!("deleted" in cust)) email = cust.email
        } catch (e) {
          console.log("[FACELESS PRO WEBHOOK] Could not retrieve customer email")
        }

        await updateFacelessProMembership({
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

        // Only process if this is a Faceless Pro subscription
        if (!priceId || !FACELESS_PRO_PRICE_IDS.includes(priceId)) {
          console.log(`[FACELESS PRO WEBHOOK] Ignoring non-Faceless Pro subscription update: ${priceId}`)
          return NextResponse.json({ received: true })
        }

        const membershipRef = adminDb.collection("memberships").doc(uid)
        const membershipDoc = await membershipRef.get()

        if (!membershipDoc.exists) {
          console.log(`[FACELESS PRO WEBHOOK] Membership doesn't exist for ${uid}, creating it`)
          const customerId = typeof sub.customer === "string" ? sub.customer : null
          const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

          if (customerId) {
            await updateFacelessProMembership({
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
          console.log(`[FACELESS PRO WEBHOOK] Subscription canceled for ${uid}`)
        }
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const uid = sub.metadata?.buyerUid

        if (!uid) {
          return NextResponse.json({ received: true })
        }

        await adminDb.collection("users").doc(uid).update({
          storefrontActive: false,
          updatedAt: FieldValue.serverTimestamp(),
        })

        await adminDb.collection("memberships").doc(uid).delete()
        await adminDb.collection("freeUsers").doc(uid).set({
          uid,
          plan: "free",
          downloadsUsed: 0,
          bundlesCreated: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        console.log(`[FACELESS PRO WEBHOOK] User ${uid} moved to free tier and storefront deactivated`)
        break
      }

      default:
        console.log(`[FACELESS PRO WEBHOOK] Unhandled event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[FACELESS PRO WEBHOOK] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
