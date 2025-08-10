import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

// Stripe setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature") || ""

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err: any) {
      console.error("❌ [Webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle only the events we care about here (others are acked below)
    if (event.type === "checkout.session.completed") {
      const sess = event.data.object as Stripe.Checkout.Session
      // Retrieve full session with line_items in case we need price/product details
      const session = await stripe.checkout.sessions.retrieve(sess.id, { expand: ["line_items"] })

      // Detect membership (subscription) checkouts — covers both Checkout Sessions and Payment Links
      const isMembership =
        session.mode === "subscription" ||
        session.metadata?.contentType === "membership" ||
        hasRecurringLineItem(session)

      if (isMembership) {
        try {
          const uid = await resolveUidForMembership(session)
          if (!uid) {
            // Don’t surface a 400 — acknowledge to stop Stripe retries, but log for follow-up.
            console.error("❌ [Webhook] Membership checkout without resolvable UID. Session:", session.id, {
              client_reference_id: session.client_reference_id,
              metadata: session.metadata,
              email: session.customer_details?.email || session.customer_email,
              fullSession: JSON.stringify(session, null, 2), // Log the full session for deep inspection
            })
            await logWebhookIssue("membership-missing-uid", session)
            // Return the specific error you're seeing to confirm we're on the right track
            return NextResponse.json({ error: "Could not find user ID" }, { status: 400 })
          }

          // Try to enrich from subscription
          const { subscriptionId, periodEnd } = await getSubscriptionInfo(session)

          await upsertMembership(uid, {
            plan: "creator_pro",
            status: "active",
            stripeCustomerId: getCustomerId(session),
            stripeSubscriptionId: subscriptionId || "",
            currentPeriodEnd: periodEnd || null,
            priceId: getPriceId(session) || process.env.STRIPE_PRICE_ID || "",
            source: "checkout.session.completed",
          })

          console.log("🎉 [Webhook] Creator Pro membership upserted for uid:", uid, "via session:", session.id)
          return NextResponse.json({ received: true })
        } catch (err) {
          console.error("❌ [Webhook] Error processing membership checkout:", err)
          // Acknowledge to prevent retries; errors are logged for ops visibility
          return NextResponse.json({ received: true })
        }
      }

      // Non-membership path: existing bundle/product-box purchase flow
      return handleBundleOrProductBoxPurchase(session)
    }

    // Keep membership doc in sync for lifecycle events
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription
      try {
        await syncMembershipFromSubscription(sub)
        return NextResponse.json({ received: true })
      } catch (err) {
        console.error("❌ [Webhook] Subscription sync failed:", err)
        return NextResponse.json({ received: true })
      }
    }

    // Ack all other events
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Webhook] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/* ---------- Helpers ---------- */

// Determine if any line item looks like a recurring price (subscription)
function hasRecurringLineItem(session: Stripe.Checkout.Session): boolean {
  const items = (session.line_items?.data as any[]) || []
  return items.some((li) => li?.price?.recurring)
}

function getCustomerId(session: Stripe.Checkout.Session): string {
  if (typeof session.customer === "string") return session.customer
  // @ts-expect-error Stripe types can be expanded
  return session.customer?.id || ""
}

function getPriceId(session: Stripe.Checkout.Session): string | undefined {
  // Prefer line_items (expanded above)
  const items = session.line_items?.data
  const first = items && items[0]
  // @ts-expect-error Stripe expands price on line item
  return first?.price?.id || session.metadata?.priceId
}

async function getSubscriptionInfo(
  session: Stripe.Checkout.Session,
): Promise<{ subscriptionId?: string; periodEnd?: Date }> {
  let subscriptionId: string | undefined
  if (typeof session.subscription === "string") {
    subscriptionId = session.subscription
  } else if (session.subscription && typeof (session.subscription as any).id === "string") {
    subscriptionId = (session.subscription as any).id
  }

  if (!subscriptionId) return {}

  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId)
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined
    return { subscriptionId: sub.id, periodEnd }
  } catch (e) {
    console.warn("⚠️ [Webhook] Could not retrieve subscription for session:", session.id)
    return { subscriptionId }
  }
}

// Resolve UID for membership using multiple strategies
async function resolveUidForMembership(session: Stripe.Checkout.Session): Promise<string | null> {
  // 1) Metadata (from our custom Checkout flow)
  const metaUid = session.metadata?.buyerUid
  if (metaUid && typeof metaUid === "string") return metaUid

  // 2) client_reference_id (we also set this in our custom Checkout flow)
  if (session.client_reference_id) return session.client_reference_id

  // 3) Customer details email (works for Payment Links which lack our metadata)
  const email = session.customer_details?.email || (session.customer_email as string | undefined)
  if (email) {
    // Try users collection by email
    const q = await db.collection("users").where("email", "==", email).limit(1).get()
    if (!q.empty) return q.docs[0].id
  }

  // 4) Try loading Stripe Customer to get email if needed
  try {
    const customerId = getCustomerId(session)
    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId)
      const custEmail = (customer as any)?.email
      if (custEmail) {
        const q = await db.collection("users").where("email", "==", custEmail).limit(1).get()
        if (!q.empty) return q.docs[0].id
      }
    }
  } catch {
    // ignore
  }

  return null
}

async function upsertMembership(
  uid: string,
  payload: {
    plan: "creator_pro" | "free"
    status: string
    stripeCustomerId: string
    stripeSubscriptionId: string
    currentPeriodEnd: Date | null
    priceId: string
    source: string
  },
) {
  const ref = db.collection("memberships").doc(uid)
  const now = new Date()
  const isActive = payload.status === "active" || payload.status === "trialing"

  await ref.set(
    {
      uid,
      plan: payload.plan,
      status: payload.status,
      isActive,
      stripeCustomerId: payload.stripeCustomerId || null,
      stripeSubscriptionId: payload.stripeSubscriptionId || null,
      priceId: payload.priceId || null,
      currentPeriodEnd: payload.currentPeriodEnd || null,
      updatedAt: now,
      // set createdAt if not present
      createdAt: now,
      features:
        payload.plan === "creator_pro"
          ? {
              unlimitedDownloads: true,
              premiumContent: true,
              noWatermark: true,
              prioritySupport: true,
              platformFeePercentage: 10,
              maxVideosPerBundle: null,
              maxBundles: null,
            }
          : {
              unlimitedDownloads: false,
              premiumContent: false,
              noWatermark: false,
              prioritySupport: false,
              platformFeePercentage: 20,
              maxVideosPerBundle: 10,
              maxBundles: 2,
            },
      source: payload.source,
    },
    { merge: true },
  )
}

// Log problematic sessions so you can inspect later in-app
async function logWebhookIssue(code: string, session: Stripe.Checkout.Session) {
  try {
    await db.collection("webhookIssues").add({
      code,
      sessionId: session.id,
      type: "checkout.session.completed",
      client_reference_id: session.client_reference_id || null,
      metadata: session.metadata || null,
      customer: typeof session.customer === "string" ? session.customer : (session.customer as any)?.id || null,
      email: session.customer_details?.email || session.customer_email || null,
      createdAt: new Date(),
    })
  } catch (e) {
    console.warn("⚠️ [Webhook] Failed to log issue:", e)
  }
}

// Keep your existing bundle/product-box flow intact
async function handleBundleOrProductBoxPurchase(session: Stripe.Checkout.Session) {
  console.log("🔍 [Webhook] Processing non-membership checkout:", session.id)
  console.log("📋 [Webhook] Session metadata:", session.metadata)

  // Existing logic expects buyerUid and bundle/productBox metadata:
  const buyerUid = session.metadata?.buyerUid
  const bundleId = session.metadata?.bundleId || session.metadata?.productBoxId
  const itemType = session.metadata?.itemType || "bundle"

  if (!buyerUid || !bundleId) {
    // This is not a membership and also lacks expected bundle metadata.
    // Acknowledge to stop retries, but log for diagnostics.
    console.warn("⚠️ [Webhook] Non-membership checkout missing required metadata", {
      buyerUid,
      bundleId,
      itemType,
      sessionId: session.id,
    })
    await logWebhookIssue("bundle-missing-metadata", session)
    return NextResponse.json({ received: true })
  }

  console.log("🔍 [Webhook] Looking up item:", bundleId)

  let itemData: any = null
  let creatorData: any = null

  try {
    // Try bundles collection first
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (bundleDoc.exists) {
      itemData = { id: bundleDoc.id, ...bundleDoc.data() }
      console.log("✅ [Webhook] Found bundle:", itemData.title)
    } else {
      // Try productBoxes collection
      const productBoxDoc = await db.collection("productBoxes").doc(bundleId).get()
      if (productBoxDoc.exists) {
        itemData = { id: productBoxDoc.id, ...productBoxDoc.data() }
        console.log("✅ [Webhook] Found product box:", itemData.title)
      }
    }

    if (!itemData) {
      console.warn("⚠️ [Webhook] Item not found:", bundleId)
      await logWebhookIssue("bundle-item-not-found", session)
      return NextResponse.json({ received: true })
    }

    // Look up creator data
    if (itemData.creatorId) {
      const creatorDoc = await db.collection("users").doc(itemData.creatorId).get()
      if (creatorDoc.exists) {
        creatorData = creatorDoc.data()
        console.log("✅ [Webhook] Found creator:", creatorData.displayName || creatorData.username)
      }
    }
  } catch (error) {
    console.error("❌ [Webhook] Error looking up item/creator:", error)
    return NextResponse.json({ received: true })
  }

  const purchaseData = {
    sessionId: session.id,
    paymentIntentId: session.payment_intent,
    buyerUid,
    buyerEmail: session.customer_details?.email || "",
    buyerName: session.customer_details?.name || "",
    itemId: bundleId,
    itemType,
    bundleId: itemType === "bundle" ? bundleId : null,
    productBoxId: itemType === "product_box" ? bundleId : null,
    title: itemData.title || "Untitled",
    description: itemData.description || "",
    thumbnailUrl: itemData.thumbnailUrl || itemData.customPreviewThumbnail || "",
    downloadUrl: itemData.downloadUrl || "",
    fileSize: itemData.fileSize || 0,
    fileType: itemData.fileType || "",
    duration: itemData.duration || 0,
    creatorId: itemData.creatorId || "",
    creatorName: creatorData?.displayName || creatorData?.username || "Unknown Creator",
    creatorUsername: creatorData?.username || "",
    amount: (session.amount_total || 0) / 100,
    currency: session.currency || "usd",
    status: "completed",
    accessUrl: itemType === "bundle" ? `/bundles/${bundleId}` : `/product-box/${bundleId}/content`,
    accessGranted: true,
    downloadCount: 0,
    purchasedAt: new Date(),
    createdAt: new Date(),
    environment: process.env.NODE_ENV === "production" ? "live" : "test",
  }

  try {
    await db.collection("bundlePurchases").doc(session.id).set(purchaseData)
    console.log("✅ [Webhook] Recorded bundle purchase:", session.id)

    if (itemData.creatorId) {
      const creatorRef = db.collection("users").doc(itemData.creatorId)
      const creatorDoc = await creatorRef.get()
      const creatorExisting = creatorDoc.data() || {}
      await creatorRef.update({
        totalSales: (creatorExisting.totalSales || 0) + purchaseData.amount,
        totalPurchases: (creatorExisting.totalPurchases || 0) + 1,
        lastSaleAt: new Date(),
      })
      console.log("✅ [Webhook] Updated creator stats")
    }

    const itemRef =
      itemType === "bundle" ? db.collection("bundles").doc(bundleId) : db.collection("productBoxes").doc(bundleId)
    const itemDoc = await itemRef.get()
    const itemExisting = itemDoc.data() || {}
    await itemRef.update({
      downloadCount: (itemExisting.downloadCount || 0) + 1,
      lastPurchaseAt: new Date(),
    })
    console.log("✅ [Webhook] Updated item stats")
  } catch (error) {
    console.error("❌ [Webhook] Error finalizing bundle purchase:", error)
    // Ack to stop Stripe retries; we logged the failure
    return NextResponse.json({ received: true })
  }

  console.log("🎉 [Webhook] Non-membership purchase completed")
  return NextResponse.json({ received: true })
}

async function syncMembershipFromSubscription(sub: Stripe.Subscription) {
  // Resolve UID via metadata (preferred) or customer email → users collection
  let uid = (sub.metadata as any)?.buyerUid as string | undefined

  if (!uid) {
    const customerId = typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id || ""
    let email = ""

    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId)
        email = (customer as any)?.email || ""
      } catch {
        // ignore
      }
    }
    if (email) {
      const q = await db.collection("users").where("email", "==", email).limit(1).get()
      if (!q.empty) uid = q.docs[0].id
    }
  }

  if (!uid) {
    console.warn("⚠️ [Webhook] Subscription event without resolvable UID. sub:", sub.id)
    return
  }

  const isActive = sub.status === "active" || sub.status === "trialing"
  const priceId = (sub.items?.data?.[0]?.price?.id as string) || process.env.STRIPE_PRICE_ID || ""
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

  await upsertMembership(uid, {
    plan: isActive ? "creator_pro" : "free",
    status: sub.status,
    stripeCustomerId: (typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id) || "",
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: periodEnd,
    priceId,
    source: `subscription.${sub.status}`,
  })
}
