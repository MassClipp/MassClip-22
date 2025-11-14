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

// FACELESS PRO WEBHOOK - Handles Faceless Pro subscriptions

const FACELESS_PRO_PRICE_IDS = [
  process.env.FACELESS_PRO_FIRST,
  process.env.FACELESS_PRO_REGULAR,
  "price_1SQ8yADheyb0pkWFK5LCP3Nd",
].filter(Boolean)

const FACELESS_PRO_CONFIG = {
  plan: "faceless_pro" as const,
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

  console.log(`[v0] ========================================`)
  console.log(`[v0] FACELESSPRENUER MEMBERSHIP UPDATE`)
  console.log(`[v0] ========================================`)
  console.log(`[v0] UID: ${uid}`)
  console.log(`[v0] Email: ${email}`)
  console.log(`[v0] Status: ${status}`)
  console.log(`[v0] Price ID: ${priceId}`)
  console.log(`[v0] Stripe Customer ID: ${stripeCustomerId}`)
  console.log(`[v0] Stripe Subscription ID: ${stripeSubscriptionId}`)
  console.log(`[v0] Current Period End: ${currentPeriodEnd}`)

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

  console.log(`[v0] Membership Data to Write:`, JSON.stringify(membershipData, null, 2))
  console.log(`[v0] Writing to Firestore path: memberships/${uid}`)

  try {
    await adminDb.collection("memberships").doc(uid).set(membershipData, { merge: true })
    console.log(`[v0] ✅ Firestore write successful!`)

    console.log(`[v0] Saving stripeCustomerId to users/${uid}...`)
    await adminDb.collection("users").doc(uid).set(
      {
        stripeCustomerId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    console.log(`[v0] ✅ stripeCustomerId saved to users collection!`)

    console.log(`[v0] ========================================`)
  } catch (error: any) {
    console.error(`[v0] ❌ Firestore write FAILED:`, error.message)
    console.error(`[v0] Error details:`, error)
    console.log(`[v0] ========================================`)
    throw error
  }
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
    plan: FACELESS_PRO_CONFIG.plan,
    status,
    isActive,
    stripeCustomerId,
    stripeSubscriptionId,
    currentPeriodEnd: currentPeriodEnd || null,
    priceId,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: {
      ...FACELESS_PRO_CONFIG.features,
      isActive,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await adminDb.collection("memberships").doc(uid).set(membershipData, { merge: true })

  console.log(`[FACELESS PRO WEBHOOK] Saving stripeCustomerId to users/${uid}...`)
  await adminDb.collection("users").doc(uid).set(
    {
      stripeCustomerId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  console.log(`[FACELESS PRO WEBHOOK] ✅ Membership updated successfully`)
}

export async function POST(request: Request) {
  try {
    console.log("=== FACELESSPRENUER/FACELESS PRO WEBHOOK RECEIVED ===")

    const webhookSecret = process.env.FACELESSPRENUER_WEBHOOK || process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Missing webhook secret (FACELESSPRENUER_WEBHOOK or STRIPE_WEBHOOK_SECRET)" },
        { status: 500 },
      )
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
      console.log(`[WEBHOOK] Event: ${event.type} (${event.id})`)
    } catch (err: any) {
      console.error(`[WEBHOOK] Signature verification failed: ${err.message}`)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Store event for debugging
    await adminDb.collection("stripeWebhookEvents").add({
      eventType: event.type,
      eventId: event.id,
      receivedAt: FieldValue.serverTimestamp(),
      rawEvent: JSON.parse(payload),
      webhook: "facelessprenuer-faceless-pro",
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
          console.log("[WEBHOOK] Missing required fields")
          return NextResponse.json({ received: true })
        }

        if (FACELESSPRENUER_PRICE_IDS.includes(priceId)) {
          await updateFacelessprenuerMembership({
            uid,
            email,
            priceId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: "active",
          })
        } else if (FACELESS_PRO_PRICE_IDS.includes(priceId)) {
          await updateFacelessProMembership({
            uid,
            email,
            priceId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: "active",
          })
        } else {
          console.log(`[WEBHOOK] Ignoring unrecognized price: ${priceId}`)
        }
        break
      }

      case "customer.subscription.created":
      case "invoice.payment_succeeded": {
        let sub: Stripe.Subscription

        if (event.type === "customer.subscription.created") {
          sub = event.data.object as Stripe.Subscription
          console.log(`[v0] Processing customer.subscription.created`)
        } else {
          const invoice = event.data.object as Stripe.Invoice
          const subscriptionId = invoice.subscription

          console.log(`[v0] ========================================`)
          console.log(`[v0] Processing invoice.payment_succeeded`)
          console.log(`[v0] Invoice ID: ${invoice.id}`)
          console.log(`[v0] Invoice Amount: ${invoice.amount_paid}`)
          console.log(`[v0] Subscription ID from invoice: ${subscriptionId}`)
          console.log(`[v0] Subscription type: ${typeof subscriptionId}`)
          console.log(`[v0] ========================================`)

          if (!subscriptionId) {
            console.log("[v0] No subscription ID in invoice - this might be a one-time payment")
            return NextResponse.json({ received: true })
          }

          if (typeof subscriptionId !== "string") {
            console.log("[v0] Subscription ID is not a string, it's an object. Extracting ID...")
            const subId = (subscriptionId as any)?.id
            if (!subId) {
              console.error("[v0] Could not extract subscription ID from object")
              return NextResponse.json({ error: "Invalid subscription ID format" }, { status: 400 })
            }

            try {
              sub = await stripe.subscriptions.retrieve(subId)
            } catch (error: any) {
              console.error("[v0] Failed to retrieve subscription:", error.message)
              return NextResponse.json({ error: `Failed to retrieve subscription: ${error.message}` }, { status: 500 })
            }
          } else {
            try {
              sub = await stripe.subscriptions.retrieve(subscriptionId)
            } catch (error: any) {
              console.error("[v0] Failed to retrieve subscription:", error.message)
              return NextResponse.json({ error: `Failed to retrieve subscription: ${error.message}` }, { status: 500 })
            }
          }
        }

        const uid = sub.metadata?.buyerUid
        const priceId = sub.items?.data?.[0]?.price?.id
        const customerId = typeof sub.customer === "string" ? sub.customer : null
        const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

        console.log(`[v0] ========================================`)
        console.log(`[v0] Subscription Metadata:`)
        console.log(`[v0] All metadata keys:`, Object.keys(sub.metadata || {}))
        console.log(`[v0] Full metadata:`, JSON.stringify(sub.metadata, null, 2))
        console.log(`[v0] Extracted UID: ${uid}`)
        console.log(`[v0] Extracted Price ID: ${priceId}`)
        console.log(`[v0] Extracted Customer ID: ${customerId}`)
        console.log(`[v0] Subscription Status: ${sub.status}`)
        console.log(`[v0] ========================================`)

        if (!uid || !priceId || !customerId) {
          console.log("[v0] ❌ Missing required fields in subscription")
          console.log(`[v0] UID present: ${!!uid}`)
          console.log(`[v0] Price ID present: ${!!priceId}`)
          console.log(`[v0] Customer ID present: ${!!customerId}`)
          return NextResponse.json({ received: true })
        }

        let email: string | null = null
        try {
          const cust = await stripe.customers.retrieve(customerId)
          if (!("deleted" in cust)) email = cust.email
        } catch (e) {
          console.log("[WEBHOOK] Could not retrieve customer email")
        }

        if (sub.status === "trialing" || (sub.status === "active" && sub.trial_end)) {
          console.log(`[v0] User started trial - marking hasUsedFreeTrial as true for UID: ${uid}`)
          try {
            const freeUserRef = adminDb.collection("freeUsers").doc(uid)
            await freeUserRef.set(
              {
                hasUsedFreeTrial: true,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            )
            console.log(`[v0] ✅ Trial usage flag set successfully`)
          } catch (error: any) {
            console.error(`[v0] ❌ Failed to set trial usage flag:`, error.message)
          }
        }

        if (FACELESSPRENUER_PRICE_IDS.includes(priceId) && sub.status === "active") {
          console.log(`[v0] Facelessprenuer subscription active - marking hasUsedFreeTrial as true for UID: ${uid}`)
          try {
            const freeUserRef = adminDb.collection("freeUsers").doc(uid)
            await freeUserRef.set(
              {
                hasUsedFreeTrial: true,
                hasEverPurchasedFacelessprenuer: true,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            )
            
            const userRef = adminDb.collection("users").doc(uid)
            await userRef.set(
              {
                hasEverPurchasedFacelessprenuer: true,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            )
            console.log(`[v0] ✅ Facelessprenuer purchase flag set successfully in both collections`)
          } catch (error: any) {
            console.error(`[v0] ❌ Failed to set Facelessprenuer purchase flag:`, error.message)
          }
        }

        if (FACELESSPRENUER_PRICE_IDS.includes(priceId)) {
          await updateFacelessprenuerMembership({
            uid,
            email,
            priceId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            currentPeriodEnd,
            status: sub.status as any,
          })
        } else if (FACELESS_PRO_PRICE_IDS.includes(priceId)) {
          await updateFacelessProMembership({
            uid,
            email,
            priceId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            currentPeriodEnd,
            status: sub.status as any,
          })
        } else {
          console.log(`[WEBHOOK] Ignoring unrecognized price: ${priceId}`)
        }
        break
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        const uid = sub.metadata?.buyerUid
        const priceId = sub.items?.data?.[0]?.price?.id

        if (!uid) {
          return NextResponse.json({ received: true })
        }

        const isFacelessprenuer = priceId && FACELESSPRENUER_PRICE_IDS.includes(priceId)
        const isFacelessPro = priceId && FACELESS_PRO_PRICE_IDS.includes(priceId)

        if (!isFacelessprenuer && !isFacelessPro) {
          console.log(`[WEBHOOK] Ignoring unrecognized subscription update: ${priceId}`)
          return NextResponse.json({ received: true })
        }

        const membershipRef = adminDb.collection("memberships").doc(uid)
        const membershipDoc = await membershipRef.get()

        if (!membershipDoc.exists) {
          console.log(`[WEBHOOK] Membership doesn't exist for ${uid}, creating it`)
          const customerId = typeof sub.customer === "string" ? sub.customer : null
          const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

          if (customerId && priceId) {
            if (isFacelessprenuer) {
              await updateFacelessprenuerMembership({
                uid,
                email: null,
                priceId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: sub.id,
                currentPeriodEnd,
                status: sub.status as any,
              })
            } else if (isFacelessPro) {
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
          console.log(`[WEBHOOK] Subscription canceled for ${uid}`)
        }
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const uid = sub.metadata?.buyerUid

        if (!uid) {
          return NextResponse.json({ received: true })
        }

        console.log(`[v0] Subscription deleted for ${uid} - preserving purchase history flags`)
        
        // Update users collection without deleting the hasEverPurchasedFacelessprenuer flag
        await adminDb.collection("users").doc(uid).update({
          storefrontActive: false,
          updatedAt: FieldValue.serverTimestamp(),
          // NOTE: We intentionally do NOT reset hasEverPurchasedFacelessprenuer here
          // This flag should persist forever to prevent users from getting free trials again
        })

        await adminDb.collection("memberships").doc(uid).delete()
        
        // Only update plan and reset usage counters, but keep hasUsedFreeTrial and hasEverPurchasedFacelessprenuer
        await adminDb.collection("freeUsers").doc(uid).set(
          {
            uid,
            plan: "free",
            downloadsUsed: 0,
            bundlesCreated: 0,
            updatedAt: FieldValue.serverTimestamp(),
            // NOTE: hasUsedFreeTrial and hasEverPurchasedFacelessprenuer are preserved via merge: true
          },
          { merge: true }
        )
        
        console.log(`[v0] User ${uid} moved to free tier. Purchase history flags preserved in both collections.`)
        break
      }

      default:
        console.log(`[WEBHOOK] Unhandled event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[WEBHOOK] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
