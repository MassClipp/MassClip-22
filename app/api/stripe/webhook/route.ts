import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

// Keep API version consistent with your Stripe usage
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err: any) {
      console.error("❌ [Webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log("✅ [Webhook] Received event:", event.type, event.id)

    // Handle membership checkout completion
    if (event.type === "checkout.session.completed") {
      const raw = event.data.object as Stripe.Checkout.Session

      // Retrieve full session with line_items to inspect prices/products when needed
      const session = await stripe.checkout.sessions.retrieve(raw.id, { expand: ["line_items"] })

      const isMembership = session.metadata?.contentType === "membership" || session.mode === "subscription"

      if (isMembership) {
        try {
          const result = await upsertMembershipFromSession(session)
          if (!result?.uid) {
            console.error("❌ [Webhook] Could not resolve user for membership session:", session.id)
            return NextResponse.json({ error: "Could not find user ID" }, { status: 400 })
          }
          console.log("🎉 [Webhook] Membership upsert complete for uid:", result.uid)
          return NextResponse.json({ received: true })
        } catch (err) {
          console.error("❌ [Webhook] Membership processing error:", err)
          return NextResponse.json({ error: "Membership processing failed" }, { status: 500 })
        }
      }

      // Existing bundle/content purchase flow (kept intact)
      console.log("ℹ️ [Webhook] Non-membership checkout, continuing bundle flow.")
      // Existing code below…

      console.log("🔍 [Webhook] Processing checkout session:", session.id)
      console.log("📋 [Webhook] Session metadata:", session.metadata)

      const buyerUid = session.metadata?.buyerUid
      const bundleId = session.metadata?.bundleId || session.metadata?.productBoxId
      const itemType = session.metadata?.itemType || "bundle"

      if (!buyerUid || !bundleId) {
        console.error("❌ [Webhook] Missing required metadata:", { buyerUid, bundleId })
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
      }

      console.log("🔍 [Webhook] Looking up bundle/item:", bundleId)

      let itemData: any = null
      let creatorData: any = null

      try {
        const bundleDoc = await db.collection("bundles").doc(bundleId).get()
        if (bundleDoc.exists) {
          itemData = { id: bundleDoc.id, ...bundleDoc.data() }
          console.log("✅ [Webhook] Found bundle:", itemData.title)
        } else {
          const productBoxDoc = await db.collection("productBoxes").doc(bundleId).get()
          if (productBoxDoc.exists) {
            itemData = { id: productBoxDoc.id, ...productBoxDoc.data() }
            console.log("✅ [Webhook] Found product box:", itemData.title)
          }
        }

        if (!itemData) {
          console.error("❌ [Webhook] Item not found:", bundleId)
          return NextResponse.json({ error: "Item not found" }, { status: 404 })
        }

        if (itemData.creatorId) {
          const creatorDoc = await db.collection("users").doc(itemData.creatorId).get()
          if (creatorDoc.exists) {
            creatorData = creatorDoc.data()
            console.log("✅ [Webhook] Found creator:", creatorData.displayName || creatorData.username)
          }
        }
      } catch (error) {
        console.error("❌ [Webhook] Error looking up item/creator:", error)
        return NextResponse.json({ error: "Database lookup failed" }, { status: 500 })
      }

      const purchaseData = {
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        buyerUid: buyerUid,
        buyerEmail: session.customer_details?.email || "",
        buyerName: session.customer_details?.name || "",
        itemId: bundleId,
        itemType: itemType,
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
        console.log("✅ [Webhook] Created purchase record in bundlePurchases:", session.id)

        if (itemData.creatorId) {
          const creatorRef = db.collection("users").doc(itemData.creatorId)
          const creatorDoc = await creatorRef.get()
          const creatorDataExisting = creatorDoc.data() || {}
          await creatorRef.update({
            totalSales: (creatorDataExisting.totalSales || 0) + purchaseData.amount,
            totalPurchases: (creatorDataExisting.totalPurchases || 0) + 1,
            lastSaleAt: new Date(),
          })
          console.log("✅ [Webhook] Updated creator sales stats")
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
        console.error("❌ [Webhook] Error creating purchase record:", error)
        return NextResponse.json({ error: "Failed to create purchase record" }, { status: 500 })
      }

      console.log("🎉 [Webhook] Purchase processing completed successfully")
      return NextResponse.json({ received: true })
    }

    // Optionally respond to subscription lifecycle events, too
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
        return NextResponse.json({ error: "Subscription sync failed" }, { status: 500 })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Webhook] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Upserts memberships/{uid} for Creator Pro from a Checkout Session.
 * Tries multiple ways to resolve the user:
 * - metadata.buyerUid
 * - client_reference_id
 * - Stripe Customer email -> Firebase Auth user or users collection lookup
 */
async function upsertMembershipFromSession(session: Stripe.Checkout.Session) {
  // 1) Resolve UID
  let uid = (session.metadata?.buyerUid as string | undefined) || (session.client_reference_id as string | undefined)

  if (!uid) {
    const email = session.customer_details?.email
    if (email) {
      // Try Firebase Auth
      try {
        const auth = getAuth()
        const userRecord = await auth.getUserByEmail(email)
        uid = userRecord.uid
      } catch {
        // Fallback: try Firestore users collection
        const usersQuery = await db.collection("users").where("email", "==", email).limit(1).get()
        if (!usersQuery.empty) {
          uid = usersQuery.docs[0].id
        }
      }
    }
  }

  if (!uid) {
    return { ok: false }
  }

  // 2) Get subscription info (period end)
  let subscriptionId: string | undefined
  if (typeof session.subscription === "string") {
    subscriptionId = session.subscription
  } else if (session.subscription && typeof session.subscription === "object") {
    subscriptionId = (session.subscription as any).id
  }

  let currentPeriodEnd: Date | undefined
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      if (sub.current_period_end) {
        currentPeriodEnd = new Date(sub.current_period_end * 1000)
      }
    } catch (e) {
      console.warn("⚠️ [Webhook] Could not retrieve subscription:", subscriptionId)
    }
  }

  // 3) Determine priceId if needed (expanded line_items included above)
  const priceId =
    (session.line_items?.data?.[0]?.price?.id as string | undefined) ||
    (session.metadata?.priceId as string | undefined) ||
    process.env.STRIPE_PRICE_ID

  const docRef = db.collection("memberships").doc(uid)
  const payload = {
    uid,
    email: session.customer_details?.email || "",
    plan: "creator_pro" as const,
    status: "active" as const,
    isActive: true,
    stripeCustomerId: typeof session.customer === "string" ? session.customer : (session.customer as any)?.id || "",
    stripeSubscriptionId: subscriptionId || "",
    priceId: priceId || "",
    currentPeriodEnd: currentPeriodEnd || null,
    updatedAt: new Date(),
    createdAt: new Date(),
    features: {
      unlimitedDownloads: true,
      premiumContent: true,
      noWatermark: true,
      prioritySupport: true,
      platformFeePercentage: 10,
      maxVideosPerBundle: null,
      maxBundles: null,
    },
    source: "checkout.session.completed",
  }

  await docRef.set(payload, { merge: true })
  return { ok: true, uid }
}

/**
 * Keeps memberships in sync from subscription lifecycle events (created/updated/deleted)
 * Attempts to resolve uid via Customer email or stored mapping.
 */
async function syncMembershipFromSubscription(sub: Stripe.Subscription) {
  // Resolve customer email
  let email = ""
  if (typeof sub.customer === "string") {
    try {
      const customer = await stripe.customers.retrieve(sub.customer as string)
      email = (customer as any)?.email || ""
    } catch (e) {
      console.warn("⚠️ [Webhook] Could not load customer:", sub.customer)
    }
  } else {
    email = (sub.customer as any)?.email || ""
  }

  // Resolve uid by email
  let uid: string | undefined
  if (email) {
    try {
      const auth = getAuth()
      const userRecord = await auth.getUserByEmail(email)
      uid = userRecord.uid
    } catch {
      const usersQuery = await db.collection("users").where("email", "==", email).limit(1).get()
      if (!usersQuery.empty) {
        uid = usersQuery.docs[0].id
      }
    }
  }

  if (!uid) {
    console.warn("⚠️ [Webhook] Subscription event without resolvable uid; skipping.")
    return
  }

  const status = sub.status // trialing | active | past_due | canceled | incomplete | ...
  const isActive = status === "active" || status === "trialing"

  const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null
  const docRef = db.collection("memberships").doc(uid)

  const payload = {
    uid,
    plan: "creator_pro" as const,
    status,
    isActive,
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id || "",
    stripeSubscriptionId: sub.id,
    currentPeriodEnd,
    updatedAt: new Date(),
    source: `subscription.${status}`,
  }

  // On canceled/deleted, keep doc but flip flags
  await docRef.set(payload, { merge: true })
}
