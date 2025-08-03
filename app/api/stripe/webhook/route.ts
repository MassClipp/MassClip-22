import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

// Use the correct Stripe key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

// Determine environment and webhook secret
const secretKey = process.env.STRIPE_SECRET_KEY!
const isProduction = process.env.NODE_ENV === "production"
const isLiveKey = secretKey?.startsWith("sk_live_")

let webhookSecret: string
if (isProduction && isLiveKey) {
  webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET!
  console.log("🔴 [Stripe Webhook] Using webhook secret for PRODUCTION with live keys")
} else if (!isProduction && !isLiveKey) {
  webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET!
  console.log("🟢 [Stripe Webhook] Using webhook secret for DEVELOPMENT with test keys")
} else {
  webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  console.log("⚠️ [Stripe Webhook] Using general webhook secret")
}

if (!webhookSecret) {
  throw new Error("Stripe webhook secret is missing. Please set STRIPE_WEBHOOK_SECRET")
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(
        `✅ [Stripe Webhook] Signature verified for event: ${event.type} in ${isLiveKey ? "LIVE" : "TEST"} mode`,
      )
    } catch (err: any) {
      console.error(`❌ [Stripe Webhook] Webhook signature verification failed:`, {
        error: err.message,
        environment: process.env.NODE_ENV,
        isLiveKey,
        webhookSecretLength: webhookSecret?.length,
        hasSignature: !!signature,
      })
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log(`🔔 [Stripe Webhook] Processing event: ${event.type} (${isLiveKey ? "LIVE" : "TEST"} mode)`)

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      await handleCheckoutSessionCompleted(session)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Stripe Webhook] Error handling webhook:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log("🔍 [Webhook] Processing checkout session:", session.id)

    // Extract metadata - this is the buyer and bundle info
    const { buyerUid, bundleId, productBoxId, creatorId } = session.metadata || {}

    if (!buyerUid) {
      console.error("❌ [Webhook] Missing buyerUid in session metadata:", session.id)
      return
    }

    const itemId = bundleId || productBoxId
    if (!itemId) {
      console.error("❌ [Webhook] Missing bundleId/productBoxId in session metadata:", session.id)
      return
    }

    console.log("✅ [Webhook] Session metadata:", { buyerUid, itemId, creatorId })

    // Check if this purchase has already been processed
    const existingPurchaseDoc = await db.collection("users").doc(buyerUid).collection("purchases").doc(session.id).get()

    if (existingPurchaseDoc.exists) {
      console.log("⚠️ [Webhook] Purchase already processed:", session.id)
      return
    }

    // Look up the bundle/product box in Firestore
    let itemData = null
    let itemType = "bundle"

    // Try bundles collection first
    const bundleDoc = await db.collection("bundles").doc(itemId).get()
    if (bundleDoc.exists) {
      itemData = bundleDoc.data()
      itemType = "bundle"
      console.log("📦 [Webhook] Found bundle:", itemData?.title)
    } else {
      // Try productBoxes collection
      const productBoxDoc = await db.collection("productBoxes").doc(itemId).get()
      if (productBoxDoc.exists) {
        itemData = productBoxDoc.data()
        itemType = "product_box"
        console.log("📦 [Webhook] Found product box:", itemData?.title)
      }
    }

    if (!itemData) {
      console.error("❌ [Webhook] Item not found in Firestore:", itemId)
      return
    }

    // Get creator details
    let creatorData = null
    const finalCreatorId = creatorId || itemData.creatorId
    if (finalCreatorId) {
      const creatorDoc = await db.collection("users").doc(finalCreatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Create simple purchase record
    const purchaseData = {
      // Item details from Firestore
      itemId,
      itemType,
      title: itemData.title || "Untitled",
      description: itemData.description || "",
      thumbnailUrl: itemData.thumbnailUrl || itemData.customPreviewThumbnail || "",

      // Creator details
      creatorId: finalCreatorId || "",
      creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
      creatorUsername: creatorData?.username || "",

      // Purchase details
      sessionId: session.id,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      status: "completed",

      // Timestamps
      purchasedAt: new Date(),
      createdAt: new Date(),

      // Access URL
      accessUrl: itemType === "bundle" ? `/bundles/${itemId}` : `/product-box/${itemId}/content`,
    }

    // Write to buyer's purchases - this is the only place we store it
    await db.collection("users").doc(buyerUid).collection("purchases").doc(session.id).set(purchaseData)

    console.log(`✅ [Webhook] Purchase saved to buyer's account: ${buyerUid}`)

    // Update item sales counter
    const itemCollection = itemType === "bundle" ? "bundles" : "productBoxes"
    await db
      .collection(itemCollection)
      .doc(itemId)
      .update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
        lastPurchaseAt: new Date(),
      })

    // Update creator's sales stats
    if (finalCreatorId) {
      await db
        .collection("users")
        .doc(finalCreatorId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
          lastSaleAt: new Date(),
        })
    }

    console.log(`✅ [Webhook] Successfully processed purchase for session: ${session.id}`)
  } catch (error) {
    console.error("❌ [Webhook] Error handling checkout.session.completed:", error)
    throw error
  }
}
