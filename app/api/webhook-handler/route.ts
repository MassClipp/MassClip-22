import { NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"
import { setCreatorPro } from "@/lib/memberships-service"

type DebugTrace = string[]

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

async function upsertMembership(opts: {
  uid: string
  email?: string | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  priceId?: string | null
  currentPeriodEnd?: Date | null
  status?: "active" | "trialing" | "past_due" | "canceled"
  source: string
  debugTrace: DebugTrace
}) {
  const {
    uid,
    email,
    stripeCustomerId,
    stripeSubscriptionId,
    priceId,
    currentPeriodEnd,
    status = "active",
    source,
    debugTrace,
  } = opts

  debugTrace.push(
    `upsertMembership(uid=${uid}, status=${status}, customer=${stripeCustomerId ?? "null"}, sub=${stripeSubscriptionId ?? "null"}, price=${priceId ?? "null"}) [${source}]`,
  )

  if (stripeCustomerId && stripeSubscriptionId) {
    await setCreatorPro(uid, {
      email: email ?? undefined,
      stripeCustomerId: stripeCustomerId,
      stripeSubscriptionId: stripeSubscriptionId,
      currentPeriodEnd: currentPeriodEnd,
      priceId: priceId ?? undefined,
      status,
    })
    debugTrace.push(`memberships/${uid} set to creator_pro with Stripe IDs`)
  } else {
    debugTrace.push(
      `Skipping Creator Pro setup - missing Stripe IDs (customer: ${stripeCustomerId}, sub: ${stripeSubscriptionId})`,
    )
    return
  }
}

async function moveToFreeUsers(uid: string, debugTrace: DebugTrace) {
  try {
    // Remove from memberships collection
    await adminDb.collection("memberships").doc(uid).delete()
    debugTrace.push(`Removed ${uid} from memberships collection`)

    // Add to freeUsers collection
    await adminDb.collection("freeUsers").doc(uid).set({
      uid,
      plan: "free",
      downloadsUsed: 0,
      bundlesCreated: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    debugTrace.push(`Added ${uid} to freeUsers collection`)
  } catch (error: any) {
    debugTrace.push(`Error moving user to freeUsers: ${error.message}`)
    throw error
  }
}

async function handleCheckoutCompleted(stripe: Stripe, event: Stripe.Event, debugTrace: DebugTrace) {
  const session = event.data.object as Stripe.Checkout.Session
  debugTrace.push(`Handling checkout.session.completed: ${session.id}`)

  const md = session.metadata || {}
  const uid =
    firstNonEmpty((md as any).buyerUid, (md as any).firebaseUid, (md as any).userId) ||
    firstNonEmpty(session.client_reference_id || undefined)
  const email = firstNonEmpty((md as any).buyerEmail, session.customer_email || undefined)
  const subscriptionId =
    (typeof session.subscription === "string" ? session.subscription : session.subscription?.id) || null
  const customerId = (typeof session.customer === "string" ? session.customer : session.customer?.id) || null
  const priceId = firstNonEmpty((md as any).priceId)

  if (!uid) {
    debugTrace.push("No uid resolved from session metadata/client_reference_id")
    return NextResponse.json({ error: "Could not find user ID", debugTrace }, { status: 400 })
  }

  const downloadCount = (md as any).downloadCount
  const source = (md as any).source

  if (downloadCount && source === "dashboard_download_purchase") {
    debugTrace.push(`Processing download purchase: ${downloadCount} downloads for user ${uid}`)

    try {
      // Record the download purchase
      await adminDb.collection("downloadPurchases").add({
        uid,
        email,
        downloadCount: Number.parseInt(downloadCount),
        priceId,
        stripeSessionId: session.id,
        stripeCustomerId: customerId,
        amount: session.amount_total,
        currency: session.currency,
        purchasedAt: new Date(),
        status: "completed",
      })
      debugTrace.push(`Recorded download purchase in downloadPurchases collection`)

      // Add downloads to user account
      const memberDoc = await adminDb.collection("memberships").doc(uid).get()
      if (memberDoc.exists) {
        // User is a member - add to memberships collection
        await adminDb
          .collection("memberships")
          .doc(uid)
          .update({
            additionalDownloads: adminDb.FieldValue.increment(Number.parseInt(downloadCount)),
            updatedAt: new Date().toISOString(),
          })
        debugTrace.push(`Added ${downloadCount} downloads to member ${uid}`)
      } else {
        // User is free - add to freeUsers collection
        const freeUserDoc = await adminDb.collection("freeUsers").doc(uid).get()
        if (freeUserDoc.exists) {
          await adminDb
            .collection("freeUsers")
            .doc(uid)
            .update({
              additionalDownloads: adminDb.FieldValue.increment(Number.parseInt(downloadCount)),
              updatedAt: new Date().toISOString(),
            })
        } else {
          // Create new free user record
          await adminDb
            .collection("freeUsers")
            .doc(uid)
            .set({
              uid,
              plan: "free",
              downloadsUsed: 0,
              bundlesCreated: 0,
              additionalDownloads: Number.parseInt(downloadCount),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
        }
        debugTrace.push(`Added ${downloadCount} downloads to free user ${uid}`)
      }

      return NextResponse.json({ received: true, downloadPurchase: true, debugTrace })
    } catch (error: any) {
      debugTrace.push(`Error processing download purchase: ${error.message}`)
      return NextResponse.json({ error: "Failed to process download purchase", debugTrace }, { status: 500 })
    }
  }

  await upsertMembership({
    uid,
    email,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    priceId,
    currentPeriodEnd: null,
    status: "active",
    source: "checkout.session.completed",
    debugTrace,
  })

  return NextResponse.json({ received: true, debugTrace })
}

async function handleInvoicePaid(stripe: Stripe, event: Stripe.Event, debugTrace: DebugTrace) {
  const invoice = event.data.object as Stripe.Invoice
  debugTrace.push(`Handling invoice.payment_succeeded: ${invoice.id}`)

  const subscriptionId =
    (typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id) || null
  const customerId = (typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id) || null
  let email = firstNonEmpty(invoice.customer_email || undefined)

  // Try to resolve uid and priceId from invoice line metadata
  let uid: string | null = null
  let priceId: string | null = null
  for (const line of invoice.lines?.data || []) {
    const buyerUid = firstNonEmpty(
      (line.metadata as any)?.buyerUid,
      (line.metadata as any)?.firebaseUid,
      (line.metadata as any)?.userId,
    )
    if (buyerUid && !uid) uid = buyerUid

    // attempt various line shapes for price id
    const p = (line as any)?.price?.id || (line as any)?.pricing?.price_details?.price
    if (typeof p === "string" && !priceId) priceId = p

    if (uid && priceId) break
  }

  // Some APIs expose parent.subscription_details.metadata in the invoice
  if (!uid) {
    const parent = (invoice as any).parent
    const subMeta = parent?.subscription_details?.metadata
    if (subMeta) {
      uid = firstNonEmpty(subMeta.buyerUid, subMeta.firebaseUid, subMeta.userId)
      if (uid) debugTrace.push(`Found uid from invoice.parent.subscription_details.metadata: ${uid}`)
    }
  }

  // If still missing, load the subscription and read metadata/email/period
  let currentPeriodEnd: Date | null = null
  if (subscriptionId && (!uid || !email || !priceId)) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      if (!uid) {
        uid = firstNonEmpty(
          (sub.metadata as any)?.buyerUid,
          (sub.metadata as any)?.firebaseUid,
          (sub.metadata as any)?.userId,
        )
      }
      if (!priceId) priceId = sub.items?.data?.[0]?.price?.id ?? null
      if (sub.current_period_end) currentPeriodEnd = new Date(sub.current_period_end * 1000)

      if (!email) {
        const custId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id
        if (custId) {
          const cust = await stripe.customers.retrieve(custId)
          if (!("deleted" in cust)) email = firstNonEmpty(cust.email || undefined)
        }
      }
    } catch (e: any) {
      debugTrace.push(`Failed to retrieve subscription ${subscriptionId}: ${e.message}`)
    }
  }

  if (!uid) {
    debugTrace.push("No uid resolved from invoice/subscription")
    return NextResponse.json({ error: "Could not find user ID", debugTrace }, { status: 400 })
  }

  await upsertMembership({
    uid,
    email,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    priceId,
    currentPeriodEnd,
    status: "active",
    source: "invoice.payment_succeeded",
    debugTrace,
  })

  return NextResponse.json({ received: true, debugTrace })
}

async function handleSubscriptionCreated(stripe: Stripe, event: Stripe.Event, debugTrace: DebugTrace) {
  const sub = event.data.object as Stripe.Subscription
  debugTrace.push(`Handling customer.subscription.created: ${sub.id}`)

  const md = sub.metadata || {}
  const uid = firstNonEmpty((md as any)?.buyerUid, (md as any)?.firebaseUid, (md as any)?.userId)
  const priceId = sub.items?.data?.[0]?.price?.id ?? null
  const customerId = (typeof sub.customer === "string" ? sub.customer : sub.customer?.id) || null
  const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

  let email: string | null = null
  if (customerId) {
    try {
      const cust = await stripe.customers.retrieve(customerId)
      if (!("deleted" in cust)) email = firstNonEmpty(cust.email || undefined)
    } catch {
      // ignore
    }
  }

  if (!uid) {
    debugTrace.push("No uid on subscription.metadata")
    return NextResponse.json({ error: "Could not find user ID", debugTrace }, { status: 400 })
  }

  await upsertMembership({
    uid,
    email,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    priceId,
    currentPeriodEnd,
    status: (sub.status as any) ?? "active",
    source: "customer.subscription.created",
    debugTrace,
  })

  return NextResponse.json({ received: true, debugTrace })
}

async function handleSubscriptionUpdated(stripe: Stripe, event: Stripe.Event, debugTrace: DebugTrace) {
  const sub = event.data.object as Stripe.Subscription
  debugTrace.push(`Handling customer.subscription.updated: ${sub.id}`)

  debugTrace.push(`Full subscription object keys: ${Object.keys(sub).join(", ")}`)
  debugTrace.push(`Subscription status: ${sub.status}`)
  debugTrace.push(`Cancel at period end: ${sub.cancel_at_period_end}`)
  debugTrace.push(`Current period end timestamp: ${sub.current_period_end}`)
  debugTrace.push(`Current period start timestamp: ${(sub as any).current_period_start}`)
  debugTrace.push(`Canceled at: ${(sub as any).canceled_at}`)
  debugTrace.push(`Cancel at: ${(sub as any).cancel_at}`)
  debugTrace.push(`Period end from items: ${sub.items?.data?.[0]?.period?.end}`)

  // Log the entire subscription object (truncated for safety)
  const subString = JSON.stringify(sub, null, 2)
  debugTrace.push(`Full subscription object (first 1000 chars): ${subString.substring(0, 1000)}`)

  debugTrace.push(
    `Current period end date: ${sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : "null"}`,
  )

  const md = sub.metadata || {}
  const uid = firstNonEmpty((md as any)?.buyerUid, (md as any)?.firebaseUid, (md as any)?.userId)

  if (!uid) {
    debugTrace.push("No uid on subscription.metadata")
    return NextResponse.json({ error: "Could not find user ID", debugTrace }, { status: 400 })
  }

  // Check if subscription is canceled (cancel_at_period_end = true)
  if (sub.cancel_at_period_end) {
    debugTrace.push(`Subscription ${sub.id} is set to cancel at period end`)

    let currentPeriodEnd: Date | null = null

    if (sub.current_period_end) {
      currentPeriodEnd = new Date(sub.current_period_end * 1000)
      debugTrace.push(`Using current_period_end: ${currentPeriodEnd.toISOString()}`)
    } else if ((sub as any).cancel_at) {
      currentPeriodEnd = new Date((sub as any).cancel_at * 1000)
      debugTrace.push(`Using cancel_at: ${currentPeriodEnd.toISOString()}`)
    } else if (sub.items?.data?.[0]?.period?.end) {
      currentPeriodEnd = new Date(sub.items.data[0].period.end * 1000)
      debugTrace.push(`Using items[0].period.end: ${currentPeriodEnd.toISOString()}`)
    } else {
      debugTrace.push("No period end date found in subscription object")
    }

    const customerId = (typeof sub.customer === "string" ? sub.customer : sub.customer?.id) || null
    const priceId = sub.items?.data?.[0]?.price?.id ?? null

    debugTrace.push(`Extracted currentPeriodEnd: ${currentPeriodEnd ? currentPeriodEnd.toISOString() : "null"}`)
    debugTrace.push(`Extracted customerId: ${customerId}`)
    debugTrace.push(`Extracted priceId: ${priceId}`)

    await upsertMembership({
      uid,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      priceId,
      currentPeriodEnd,
      status: "canceled",
      source: "customer.subscription.updated",
      debugTrace,
    })
  }

  return NextResponse.json({ received: true, debugTrace })
}

async function handleSubscriptionDeleted(stripe: Stripe, event: Stripe.Event, debugTrace: DebugTrace) {
  const sub = event.data.object as Stripe.Subscription
  debugTrace.push(`Handling customer.subscription.deleted: ${sub.id}`)

  const md = sub.metadata || {}
  const uid = firstNonEmpty((md as any)?.buyerUid, (md as any)?.firebaseUid, (md as any)?.userId)

  if (!uid) {
    debugTrace.push("No uid on subscription.metadata")
    return NextResponse.json({ error: "Could not find user ID", debugTrace }, { status: 400 })
  }

  // Move user back to freeUsers collection
  await moveToFreeUsers(uid, debugTrace)

  return NextResponse.json({ received: true, debugTrace })
}

export async function POST(request: Request) {
  const debugTrace: DebugTrace = []
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      debugTrace.push("Missing STRIPE_WEBHOOK_SECRET")
      return NextResponse.json({ error: "Server configuration error", debugTrace }, { status: 500 })
    }

    try {
      await adminDb.collection("test").limit(1).get()
      debugTrace.push("Firebase initialized successfully")
    } catch (error: any) {
      debugTrace.push(`Firebase initialization failed: ${error.message}`)
      return NextResponse.json({ error: "Firestore not initialized", debugTrace }, { status: 500 })
    }

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

    // Store raw event for diagnostics (best-effort)
    try {
      await adminDb.collection("stripeWebhookEvents").add({
        eventType: event.type,
        eventId: event.id,
        receivedAt: new Date(),
        rawEvent: JSON.parse(payload),
      })
    } catch (e) {
      console.warn("Failed to store raw event:", e)
    }

    switch (event.type) {
      case "checkout.session.completed":
        return await handleCheckoutCompleted(stripe, event, debugTrace)
      case "invoice.payment_succeeded":
        return await handleInvoicePaid(stripe, event, debugTrace)
      case "customer.subscription.created":
        return await handleSubscriptionCreated(stripe, event, debugTrace)
      case "customer.subscription.updated":
        return await handleSubscriptionUpdated(stripe, event, debugTrace)
      case "customer.subscription.deleted":
        return await handleSubscriptionDeleted(stripe, event, debugTrace)
      default:
        debugTrace.push(`No-op for event ${event.type}`)
        return NextResponse.json({ received: true, debugTrace })
    }
  } catch (error: any) {
    console.error("Webhook error:", error)
    debugTrace.push(`Webhook error: ${error.message}`)
    return NextResponse.json({ error: error?.message || "Unknown error", debugTrace }, { status: 500 })
  }
}
