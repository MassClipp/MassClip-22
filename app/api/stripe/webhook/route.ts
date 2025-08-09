import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

// Use your configured secret(s)
const stripeSecret = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_TEST || ""
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET_TEST || ""

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2024-06-20",
})

/**
 * Resolve a Firebase user ID from a Checkout Session using multiple strategies:
 * 1) metadata.buyerUid
 * 2) client_reference_id
 * 3) customer_details.email -> users collection lookup by email
 */
async function resolveUidFromSession(session: Stripe.Checkout.Session): Promise<string | null> {
  // 1) Preferred: metadata.buyerUid
  const metaUid = (session.metadata as any)?.buyerUid || (session.subscription_details as any)?.metadata?.buyerUid
  if (metaUid && typeof metaUid === "string") return metaUid

  // 2) client_reference_id
  if (session.client_reference_id) return session.client_reference_id

  // 3) Email lookup in Firestore "users" collection
  const email = session.customer_details?.email || (session.customer_email as string | undefined)
  if (email) {
    try {
      const q = await db.collection("users").where("email", "==", email).limit(1).get()
      if (!q.empty) return q.docs[0].id
    } catch (err) {
      console.warn("⚠️ [Webhook] Firestore email lookup failed:", err)
    }
  }

  return null
}

/**
 * Upsert the memberships/{uid} doc for Creator Pro on Checkout completion.
 * Note: currentPeriodEnd is typically finalized on subscription.updated, so we leave it null here.
 */
async function upsertMembershipFromCheckout(uid: string, session: Stripe.Checkout.Session) {
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : (session.subscription as any)?.id || ""

  const customerId = typeof session.customer === "string" ? session.customer : (session.customer as any)?.id || ""

  const priceId = (session.metadata as any)?.priceId || process.env.STRIPE_PRICE_ID || null

  const ref = db.collection("memberships").doc(uid)
  const now = new Date()

  await ref.set(
    {
      uid,
      email: session.customer_details?.email || "",
      plan: "creator_pro",
      status: "active",
      isActive: true,
      stripeCustomerId: customerId || null,
      stripeSubscriptionId: subscriptionId || null,
      priceId,
      currentPeriodEnd: null, // will be updated by subscription.updated
      features: {
        unlimitedDownloads: true,
        premiumContent: true,
        noWatermark: true,
        prioritySupport: true,
        platformFeePercentage: 10,
        maxVideosPerBundle: null,
        maxBundles: null,
      },
      updatedAt: now,
      createdAt: now,
      source: "checkout.session.completed",
    },
    { merge: true },
  )
}

export async function POST(request: NextRequest) {
  try {
    if (!stripeSecret || !endpointSecret) {
      console.error("❌ [Webhook] Missing Stripe secrets")
      return NextResponse.json({ error: "Server not configured" }, { status: 500 })
    }

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

    // Handle Checkout Session completion
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      // Treat subscription-mode sessions as membership checkouts
      const isMembership = session.mode === "subscription" || (session.metadata as any)?.contentType === "membership"

      if (isMembership) {
        try {
          const uid = await resolveUidFromSession(session)

          if (!uid) {
            // Acknowledge with 200 to stop retries; subscription.created/updated will still sync the membership.
            console.warn(
              "⚠️ [Webhook] Membership checkout completed but UID could not be resolved. Acknowledging to stop retries.",
              { sessionId: session.id, email: session.customer_details?.email },
            )
            return NextResponse.json({ received: true })
          }

          await upsertMembershipFromCheckout(uid, session)
          console.log("🎉 [Webhook] Membership upserted for uid:", uid)
          return NextResponse.json({ received: true })
        } catch (err) {
          console.error("❌ [Webhook] Membership processing error:", err)
          // Still acknowledge to avoid noisy retries; subscription.updated will catch up.
          return NextResponse.json({ received: true })
        }
      }

      // Non-membership (bundle/product) flow — preserve existing logic
      console.log("ℹ️ [Webhook] Non-membership checkout, continuing bundle flow.")
      console.log("🔍 [Webhook] Processing checkout session:", session.id)
      console.log("📋 [Webhook] Session metadata:", session.metadata)

      const buyerUid = (session.metadata as any)?.buyerUid
      const bundleId = (session.metadata as any)?.bundleId || (session.metadata as any)?.productBoxId
      const itemType = (session.metadata as any)?.itemType || "bundle"

      if (!buyerUid || !bundleId) {
        console.error("❌ [Webhook] Missing required metadata for bundle purchase:", { buyerUid, bundleId })
        // For non-membership purchases, keep 400 to surface integration issues.
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
      }

      console.log("🔍 [Webhook] Looking up bundle/item:", bundleId)

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
          console.error("❌ [Webhook] Item not found:", bundleId)
          return NextResponse.json({ error: "Item not found" }, { status: 404 })
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
        return NextResponse.json({ error: "Database lookup failed" }, { status: 500 })
      }

      // Create purchase record in bundlePurchases collection
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
        amount: (session.amount_total || 0) / 100, // cents -> unit
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
        // Write to bundlePurchases
        await db.collection("bundlePurchases").doc(session.id).set(purchaseData)
        console.log("✅ [Webhook] Created purchase record in bundlePurchases:", session.id)

        // Update creator stats
        if (itemData.creatorId) {
          const creatorRef = db.collection("users").doc(itemData.creatorId)
          const creatorSnap = await creatorRef.get()
          const creatorExisting = creatorSnap.data() || {}
          await creatorRef.update({
            totalSales: (creatorExisting.totalSales || 0) + purchaseData.amount,
            totalPurchases: (creatorExisting.totalPurchases || 0) + 1,
            lastSaleAt: new Date(),
          })
          console.log("✅ [Webhook] Updated creator sales stats")
        }

        // Update item stats
        const itemRef =
          itemType === "bundle" ? db.collection("bundles").doc(bundleId) : db.collection("productBoxes").doc(bundleId)
        const itemSnap = await itemRef.get()
        const itemExisting = itemSnap.data() || {}
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

    // We already succeed on subscription lifecycle events elsewhere,
    // but you can optionally mirror membership updates here as well.
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Webhook] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
