import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore, type FirebaseFirestore } from "firebase-admin/firestore"
import {
  ensureMembership,
  setCreatorPro,
  // setCreatorProStatus, // reserved for future cancel/past_due handling
  type MembershipStatus,
} from "@/lib/memberships-service"

// Initialize Firebase Admin outside the handler for better performance
let firebaseInitialized = false
let db: FirebaseFirestore | null = null

function initFirebase() {
  if (!firebaseInitialized) {
    try {
      initializeFirebaseAdmin()
      db = getFirestore()
      firebaseInitialized = true
      console.log("🔥 Firebase initialized successfully in webhook handler")
    } catch (error) {
      console.error("🔥 Firebase initialization error:", error)
      throw error
    }
  }
  return db!
}

type DebugTrace = string[]

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY")
  }
  return new Stripe(key, { apiVersion: "2023-10-16" })
}

async function storeRawEvent(
  firestore: FirebaseFirestore,
  event: Stripe.Event,
  payload: string,
  debugTrace: DebugTrace,
) {
  try {
    await firestore.collection("stripeWebhookEvents").add({
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date(),
      rawEvent: JSON.parse(payload),
      debugTrace,
    })
    console.log(`🪝 WEBHOOK: Stored raw event ${event.id} in Firestore`)
  } catch (err) {
    console.error("🪝 WEBHOOK ERROR: Failed to store raw event:", err)
  }
}

function firstNonEmpty(...vals: Array<string | null | undefined>): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim().length > 0) return v
  }
  return null
}

async function upgradeUserToCreatorPro(
  firestore: FirebaseFirestore,
  params: {
    userId: string
    email?: string | null
    sessionId?: string | null
    subscriptionId?: string | null
    customerId?: string | null
    priceId?: string | null
    status?: MembershipStatus
    currentPeriodEnd?: Date | null
    amountTotal?: number | null
    currency?: string | null
    source?: string
    debugTrace: DebugTrace
  },
) {
  const {
    userId,
    email,
    sessionId,
    subscriptionId,
    customerId,
    priceId,
    status = "active",
    currentPeriodEnd,
    amountTotal,
    currency,
    source = "webhook",
    debugTrace,
  } = params

  debugTrace.push(
    `upgradeUserToCreatorPro(userId=${userId}, sessionId=${sessionId || ""}, subscriptionId=${subscriptionId || ""}, customerId=${customerId || ""}, priceId=${priceId || ""})`,
  )

  // 1) Ensure user exists in users collection (legacy fields update remains)
  const userRef = firestore.collection("users").doc(userId)
  const userDoc = await userRef.get()
  if (!userDoc.exists) {
    debugTrace.push(`User ${userId} not found in Firestore`)
    throw new Error(`User ${userId} not found`)
  }

  // 2) Update legacy "users" doc (kept for backward compatibility)
  await userRef.update({
    plan: "creator_pro",
    permissions: {
      download: true,
      premium: true,
    },
    updatedAt: new Date(),
    paymentStatus: status === "active" || status === "trialing" ? "active" : status,
    stripeCustomerId: customerId ?? userDoc.get("stripeCustomerId") ?? null,
    stripeSubscriptionId: subscriptionId ?? userDoc.get("stripeSubscriptionId") ?? null,
  })
  debugTrace.push(`Updated users/${userId} plan=creator_pro, premium=true`)

  // 3) Ensure memberships/{uid} exists and mark creator_pro (canonical)
  await ensureMembership(userId, email ?? undefined)
  await setCreatorPro(userId, {
    email: email ?? undefined,
    stripeCustomerId: customerId || "",
    stripeSubscriptionId: subscriptionId || "",
    currentPeriodEnd: currentPeriodEnd ?? undefined,
    priceId: priceId ?? undefined,
    status, // "active" | "trialing" | "past_due" | "canceled"
  })
  debugTrace.push(`Upserted memberships/${userId} with plan=creator_pro, status=${status}`)

  // 4) Log payment summary if we have values
  if (amountTotal || sessionId || subscriptionId) {
    await firestore.collection("payments").add({
      userId,
      email: email || null,
      amount: amountTotal ?? null,
      currency: currency ?? null,
      status: "completed",
      sessionId: sessionId || null,
      subscriptionId: subscriptionId || null,
      source,
      timestamp: new Date(),
    })
    debugTrace.push(`Logged payment for user ${userId}`)
  }
}

async function resolveUserFromSession(
  firestore: FirebaseFirestore,
  session: Stripe.Checkout.Session,
  debugTrace: DebugTrace,
) {
  let userId: string | null = null
  let email: string | null = null

  debugTrace.push("Resolving user from checkout.session")

  const md = session.metadata || {}
  const buyerUid = firstNonEmpty((md as any).buyerUid, (md as any).firebaseUid, (md as any).userId)
  const refId = firstNonEmpty(session.client_reference_id || undefined)

  if (buyerUid) {
    userId = buyerUid
    debugTrace.push(`Found userId via session.metadata.buyerUid/firebaseUid/userId: ${userId}`)
  } else if (refId) {
    userId = refId
    debugTrace.push(`Found userId via session.client_reference_id: ${userId}`)
  }

  email = firstNonEmpty((md as any).buyerEmail, session.customer_email || undefined)

  // Fallback by customer id then email
  if (!userId && session.customer) {
    try {
      const customerId = typeof session.customer === "string" ? session.customer : session.customer.id
      debugTrace.push(`Querying users by stripeCustomerId=${customerId}`)
      const q = await firestore.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get()
      if (!q.empty) {
        userId = q.docs[0].id
        debugTrace.push(`Found userId by stripeCustomerId: ${userId}`)
      }
    } catch (err) {
      debugTrace.push(`Error querying by customerId: ${(err as Error).message}`)
    }
  }

  if (!userId && email) {
    try {
      debugTrace.push(`Querying users by email=${email}`)
      const q = await firestore.collection("users").where("email", "==", email).limit(1).get()
      if (!q.empty) {
        userId = q.docs[0].id
        debugTrace.push(`Found userId by email: ${userId}`)
      }
    } catch (err) {
      debugTrace.push(`Error querying by email: ${(err as Error).message}`)
    }
  }

  return { userId, email }
}

async function resolveUserFromInvoiceOrSubscription(
  firestore: FirebaseFirestore,
  stripe: Stripe,
  invoice: Stripe.Invoice | null,
  subscriptionId: string | null,
  debugTrace: DebugTrace,
) {
  let userId: string | null = null
  let email: string | null = null
  let priceId: string | null = null
  let customerId: string | null = null
  let currentPeriodEnd: Date | null = null

  debugTrace.push("Resolving user from invoice/subscription")

  // From invoice
  if (invoice) {
    email = firstNonEmpty(invoice.customer_email || undefined)
    customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null

    const lines = invoice.lines?.data || []
    for (const line of lines) {
      const buyerUid = firstNonEmpty(
        (line.metadata as any)?.buyerUid,
        (line.metadata as any)?.firebaseUid,
        (line.metadata as any)?.userId,
      )
      if (buyerUid) {
        userId = buyerUid
        debugTrace.push(`Found userId via invoice line metadata: ${userId}`)
      }
      // Try to capture priceId
      const p = (line as any)?.pricing?.price_details?.price || (line as any)?.price?.id
      if (typeof p === "string" && p) {
        priceId = p
      }
      if (userId && priceId) break
    }

    // Parent subscription metadata (present in your event)
    if (!userId) {
      const parent = (invoice as any).parent
      const subMeta = parent?.subscription_details?.metadata
      if (subMeta) {
        const buyerUid = firstNonEmpty(subMeta.buyerUid, subMeta.firebaseUid, subMeta.userId)
        if (buyerUid) {
          userId = buyerUid
          debugTrace.push(`Found userId via invoice.parent.subscription_details.metadata: ${userId}`)
        }
      }
    }
  }

  // Load subscription for price/currentPeriodEnd if needed
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      const md = sub.metadata || {}
      const buyerUid = firstNonEmpty((md as any).buyerUid, (md as any).firebaseUid, (md as any).userId)
      if (!userId && buyerUid) {
        userId = buyerUid
        debugTrace.push(`Found userId via subscription.metadata: ${userId}`)
      }
      const firstItem = sub.items?.data?.[0]
      const pId = firstItem?.price?.id
      if (!priceId && pId) priceId = pId
      if (!customerId) {
        customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null
      }
      if (sub.current_period_end) {
        currentPeriodEnd = new Date(sub.current_period_end * 1000)
      }
      if (!email && customerId) {
        const cust = await stripe.customers.retrieve(customerId)
        if (!("deleted" in cust)) {
          email = firstNonEmpty(cust.email || undefined)
        }
      }
    } catch (err) {
      debugTrace.push(`Error retrieving subscription ${subscriptionId}: ${(err as Error).message}`)
    }
  }

  // Fallback by customerId mapping in Firestore
  if (!userId && customerId) {
    try {
      debugTrace.push(`Querying users by stripeCustomerId=${customerId}`)
      const q = await firestore.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get()
      if (!q.empty) {
        userId = q.docs[0].id
        debugTrace.push(`Found userId by stripeCustomerId: ${userId}`)
      }
    } catch (err) {
      debugTrace.push(`Error querying by customerId: ${(err as Error).message}`)
    }
  }

  // Fallback by email
  if (!userId && email) {
    try {
      debugTrace.push(`Querying users by email=${email}`)
      const q = await firestore.collection("users").where("email", "==", email).limit(1).get()
      if (!q.empty) {
        userId = q.docs[0].id
        debugTrace.push(`Found userId by email: ${userId}`)
      }
    } catch (err) {
      debugTrace.push(`Error querying by email: ${(err as Error).message}`)
    }
  }

  return { userId, email, priceId, customerId, currentPeriodEnd }
}

export async function POST(request: Request) {
  console.log("------------ 🪝 WEBHOOK HANDLER START ------------")
  const debugTrace: DebugTrace = []

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      debugTrace.push("Missing STRIPE_SECRET_KEY")
      return NextResponse.json({ error: "Server configuration error", debugTrace }, { status: 500 })
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      debugTrace.push("Missing STRIPE_WEBHOOK_SECRET")
      return NextResponse.json({ error: "Server configuration error", debugTrace }, { status: 500 })
    }

    const firestore = initFirebase()
    const stripe = getStripe()

    const payload = await request.text()
    const sig = request.headers.get("stripe-signature")

    if (!sig) {
      debugTrace.push("Missing stripe-signature header")
      return NextResponse.json({ error: "Missing stripe-signature header", debugTrace }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET)
      debugTrace.push(`Verified signature for event ${event.id} (${event.type})`)
    } catch (err: any) {
      debugTrace.push(`Signature verification failed: ${err.message}`)
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}`, debugTrace },
        { status: 400 },
      )
    }

    await storeRawEvent(firestore, event, payload, debugTrace)

    // Membership happy-path
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      debugTrace.push(`Handling checkout.session.completed: ${session.id}`)

      const { userId, email } = await resolveUserFromSession(firestore, session, debugTrace)

      if (userId) {
        const subscriptionId =
          (typeof session.subscription === "string" ? session.subscription : session.subscription?.id) || null
        const customerId = (typeof session.customer === "string" ? session.customer : session.customer?.id) || null
        const priceId = firstNonEmpty((session.metadata as any)?.priceId)
        await upgradeUserToCreatorPro(firestore, {
          userId,
          email,
          sessionId: session.id,
          subscriptionId,
          customerId,
          priceId,
          status: "active",
          currentPeriodEnd: null, // can be added by fetching subscription if needed
          amountTotal: session.amount_total ?? null,
          currency: session.currency ?? null,
          source: "checkout.session.completed",
          debugTrace,
        })
        debugTrace.push(`Completed upgrade for user ${userId} from session ${session.id}`)
      } else {
        debugTrace.push("Could not resolve user from session via metadata/client_reference_id/customerId/email")
        console.error("🪝 WEBHOOK ERROR: Could not find user ID from session or customer")
        return NextResponse.json({ error: "Could not find user ID", debugTrace }, { status: 400 })
      }
    }

    // Safety net for subscription lifecycle billing
    else if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice
      debugTrace.push(`Handling invoice.payment_succeeded: ${invoice.id}`)

      const subscriptionId =
        typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id || null

      const { userId, email, priceId, customerId, currentPeriodEnd } = await resolveUserFromInvoiceOrSubscription(
        firestore,
        stripe,
        invoice,
        subscriptionId,
        debugTrace,
      )

      if (userId) {
        await upgradeUserToCreatorPro(firestore, {
          userId,
          email,
          subscriptionId,
          customerId,
          priceId,
          status: "active",
          currentPeriodEnd: currentPeriodEnd ?? undefined,
          amountTotal: invoice.total ?? null,
          currency: invoice.currency ?? null,
          source: "invoice.payment_succeeded",
          debugTrace,
        })
        debugTrace.push(`Completed upgrade for user ${userId} from invoice ${invoice.id}`)
      } else {
        debugTrace.push("Could not resolve user from invoice/subscription")
        console.error("🪝 WEBHOOK ERROR: Could not find user ID from invoice/subscription")
        return NextResponse.json({ error: "Could not find user ID", debugTrace }, { status: 400 })
      }
    } else if (event.type === "customer.subscription.created") {
      const sub = event.data.object as Stripe.Subscription
      debugTrace.push(`Handling customer.subscription.created: ${sub.id}`)

      const md = sub.metadata || {}
      const userId = firstNonEmpty((md as any).buyerUid, (md as any).firebaseUid, (md as any).userId) || null

      let email: string | null = null
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null
      if (customerId) {
        try {
          const cust = await getStripe().customers.retrieve(customerId)
          if (!("deleted" in cust)) {
            email = firstNonEmpty(cust.email || undefined)
          }
        } catch {
          // ignore
        }
      }

      const firstItem = sub.items?.data?.[0]
      const priceId = firstItem?.price?.id || null
      const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

      if (userId) {
        await upgradeUserToCreatorPro(firestore, {
          userId,
          email,
          subscriptionId: sub.id,
          customerId,
          priceId,
          status: (sub.status as MembershipStatus) ?? "active",
          currentPeriodEnd,
          amountTotal: null,
          currency: null,
          source: "customer.subscription.created",
          debugTrace,
        })
        debugTrace.push(`Completed upgrade for user ${userId} from subscription ${sub.id}`)
      } else {
        debugTrace.push("Could not resolve user from subscription.created")
        return NextResponse.json({ error: "Could not find user ID", debugTrace }, { status: 400 })
      }
    }

    // Other events: no-op
    else {
      debugTrace.push(`No handler for event type: ${event.type}`)
    }

    console.log("------------ 🪝 WEBHOOK HANDLER END ------------")
    return NextResponse.json({ received: true, debugTrace })
  } catch (error: any) {
    console.error("🪝 WEBHOOK ERROR:", error)
    return NextResponse.json({ error: error?.message || "Unknown error in webhook handler" }, { status: 500 })
  }
}
