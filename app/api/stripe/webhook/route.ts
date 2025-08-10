import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Strictly handle the TEST price only for membership
const TEST_PRICE_ID = "price_1RuLpLDheyb0pkWF5v2Psykg"

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("stripe-signature") || ""

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret)
    } catch (err: any) {
      console.error("❌ [Webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    if (event.type === "checkout.session.completed") {
      const baseSession = event.data.object as Stripe.Checkout.Session
      const session = await stripe.checkout.sessions.retrieve(baseSession.id, {
        expand: ["line_items", "customer", "subscription"],
      })

      // Only treat as membership if price matches our test price exactly
      if (isTestMembershipSession(session)) {
        try {
          const uid = await resolveUidForMembership(session)
          if (!uid) {
            console.warn("⚠️ [Webhook] Test membership checkout: could not resolve uid.", {
              sessionId: session.id,
              client_reference_id: session.client_reference_id,
              metadata: session.metadata,
              email: session.customer_details?.email || (session.customer_email as string | undefined) || null,
            })
            await logWebhookIssue("membership-missing-uid", session)
            return NextResponse.json({ received: true })
          }

          const { subscriptionId, periodEnd } = await getSubscriptionInfo(session)

          await upsertMembership(uid, {
            plan: "creator_pro",
            status: "active",
            stripeCustomerId: getCustomerId(session),
            stripeSubscriptionId: subscriptionId || "",
            currentPeriodEnd: periodEnd || null,
            priceId: TEST_PRICE_ID, // pin
            source: "checkout.session.completed",
          })

          console.log("🎉 [Webhook] Test membership upserted for uid:", uid)
          return NextResponse.json({ received: true })
        } catch (err) {
          console.error("❌ [Webhook] Test membership processing error:", err)
          return NextResponse.json({ received: true })
        }
      }

      // Otherwise, proceed with your non-membership flow (bundles/product boxes)
      return handleBundleOrProductBoxPurchase(session)
    }

    // Keep memberships synced with lifecycle events (only if test price matches)
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      try {
        const sub = event.data.object as Stripe.Subscription
        await syncMembershipFromSubscription(sub)
        return NextResponse.json({ received: true })
      } catch (err) {
        console.error("❌ [Webhook] Subscription sync error:", err)
        return NextResponse.json({ received: true })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Webhook] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/* ---------------- Helpers ---------------- */

function getCustomerId(session: Stripe.Checkout.Session): string {
  if (typeof session.customer === "string") return session.customer
  // @ts-expect-error expanded type
  return session.customer?.id || ""
}

function getPriceId(session: Stripe.Checkout.Session): string | undefined {
  const li = session.line_items?.data?.[0] as any
  return li?.price?.id || session.metadata?.priceId
}

function isTestMembershipSession(session: Stripe.Checkout.Session): boolean {
  const priceId = getPriceId(session)
  return priceId === TEST_PRICE_ID
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
  } catch {
    return { subscriptionId }
  }
}

async function resolveUidForMembership(session: Stripe.Checkout.Session): Promise<string | null> {
  // 1) metadata.buyerUid
  const metaUid = session.metadata?.buyerUid
  if (metaUid && typeof metaUid === "string") return metaUid

  // 2) client_reference_id
  if (session.client_reference_id) return session.client_reference_id

  // 3) email lookup
  const email = session.customer_details?.email || (session.customer_email as string | undefined)
  if (email) {
    const q = await db.collection("users").where("email", "==", email).limit(1).get()
    if (!q.empty) return q.docs[0].id
  }

  // 4) load Stripe Customer for email
  try {
    const customerId = getCustomerId(session)
    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId)
      const custEmail = (customer as any)?.email
      if (custEmail) {
        const q2 = await db.collection("users").where("email", "==", custEmail).limit(1).get()
        if (!q2.empty) return q2.docs[0].id
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

async function logWebhookIssue(code: string, session: Stripe.Checkout.Session) {
  try {
    await db.collection("webhookIssues").add({
      code,
      type: "checkout.session.completed",
      sessionId: session.id,
      client_reference_id: session.client_reference_id || null,
      metadata: session.metadata || null,
      customer: typeof session.customer === "string" ? session.customer : (session.customer as any)?.id || null,
      email: session.customer_details?.email || (session.customer_email as string | undefined) || null,
      createdAt: new Date(),
    })
  } catch (e) {
    console.warn("⚠️ [Webhook] Failed to log issue:", e)
  }
}

/**
 * Non-membership purchase flow (bundles/product boxes).
 */
async function handleBundleOrProductBoxPurchase(session: Stripe.Checkout.Session) {
  console.log("🔍 [Webhook] Processing non-membership checkout:", session.id)
  console.log("📋 [Webhook] Session metadata:", session.metadata)

  const buyerUid = session.metadata?.buyerUid
  const bundleId = session.metadata?.bundleId || session.metadata?.productBoxId
  const itemType = session.metadata?.itemType || "bundle"

  if (!buyerUid || !bundleId) {
    console.warn("⚠️ [Webhook] Non-membership checkout missing metadata", {
      buyerUid,
      bundleId,
      itemType,
      sessionId: session.id,
    })
    await logWebhookIssue("bundle-missing-metadata", session)
    return NextResponse.json({ received: true })
  }

  try {
    let itemData: any = null
    let creatorData: any = null

    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (bundleDoc.exists) {
      itemData = { id: bundleDoc.id, ...bundleDoc.data() }
    } else {
      const productBoxDoc = await db.collection("productBoxes").doc(bundleId).get()
      if (productBoxDoc.exists) {
        itemData = { id: productBoxDoc.id, ...productBoxDoc.data() }
      }
    }

    if (!itemData) {
      console.warn("⚠️ [Webhook] Item not found:", bundleId)
      await logWebhookIssue("bundle-item-not-found", session)
      return NextResponse.json({ received: true })
    }

    if (itemData.creatorId) {
      const creatorDoc = await db.collection("users").doc(itemData.creatorId).get()
      if (creatorDoc.exists) creatorData = creatorDoc.data()
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

    await db.collection("bundlePurchases").doc(session.id).set(purchaseData)

    if (itemData.creatorId) {
      const creatorRef = db.collection("users").doc(itemData.creatorId)
      const creatorDoc = await creatorRef.get()
      const creatorExisting = creatorDoc.data() || {}
      await creatorRef.update({
        totalSales: (creatorExisting.totalSales || 0) + purchaseData.amount,
        totalPurchases: (creatorExisting.totalPurchases || 0) + 1,
        lastSaleAt: new Date(),
      })
    }

    const itemRef =
      itemType === "bundle" ? db.collection("bundles").doc(bundleId) : db.collection("productBoxes").doc(bundleId)
    const itemDoc = await itemRef.get()
    const itemExisting = itemDoc.data() || {}
    await itemRef.update({
      downloadCount: (itemExisting.downloadCount || 0) + 1,
      lastPurchaseAt: new Date(),
    })

    console.log("🎉 [Webhook] Non-membership purchase recorded:", session.id)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Webhook] Non-membership flow error:", error)
    return NextResponse.json({ received: true })
  }
}

async function syncMembershipFromSubscription(sub: Stripe.Subscription) {
  // Only sync if the subscription item price is our TEST price
  const priceId = (sub.items?.data?.[0]?.price?.id as string) || ""
  if (priceId !== TEST_PRICE_ID) {
    console.log("ℹ️ [Webhook] Skipping non-test subscription:", { sub: sub.id, priceId })
    return
  }

  // Resolve UID by metadata or customer email -> users collection
  let uid = (sub.metadata as any)?.buyerUid as string | undefined

  if (!uid) {
    try {
      const customerId = typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id || ""
      if (customerId) {
        const customer = await stripe.customers.retrieve(customerId)
        const email = (customer as any)?.email as string | undefined
        if (email) {
          const q = await db.collection("users").where("email", "==", email).limit(1).get()
          if (!q.empty) uid = q.docs[0].id
        }
      }
    } catch {
      // ignore
    }
  }

  if (!uid) {
    console.warn("⚠️ [Webhook] Test subscription event: unable to resolve uid. sub:", sub.id)
    return
  }

  const status = sub.status
  const isActive = status === "active" || status === "trialing"
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

  await upsertMembership(uid, {
    plan: isActive ? "creator_pro" : "free",
    status,
    stripeCustomerId: (typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id) || "",
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: periodEnd,
    priceId: TEST_PRICE_ID, // pin
    source: `subscription.${status}`,
  })
}
