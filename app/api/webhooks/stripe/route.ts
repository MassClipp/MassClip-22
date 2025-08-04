import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      console.error("❌ [Webhook] No Stripe signature found")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error(`❌ [Webhook] Signature verification failed: ${err.message}`)
      return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
    }

    console.log(`🎯 [Webhook] Processing event: ${event.type} (${event.id})`)

    // Handle checkout.session.completed events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log(`💳 [Webhook] Processing checkout session: ${session.id}`)
      console.log(`💰 [Webhook] Amount: ${session.amount_total} ${session.currency}`)
      console.log(`👤 [Webhook] Customer: ${session.customer_details?.email}`)

      // Check if purchase already exists (prevent duplicates)
      const existingPurchase = await db.collection("bundlePurchases").doc(session.id).get()
      if (existingPurchase.exists) {
        console.log(`⚠️ [Webhook] Purchase already exists for session: ${session.id}`)
        return NextResponse.json({ received: true, message: "Purchase already processed" })
      }

      // Extract metadata from session
      const metadata = session.metadata || {}
      const bundleId = metadata.bundleId
      const productBoxId = metadata.productBoxId
      const creatorId = metadata.creatorId
      const buyerUid = metadata.buyerUid || "anonymous"

      console.log(`📦 [Webhook] Metadata:`, {
        bundleId,
        productBoxId,
        creatorId,
        buyerUid,
      })

      if (!creatorId) {
        console.error(`❌ [Webhook] No creator ID in metadata for session: ${session.id}`)
        return NextResponse.json({ error: "Missing creator ID" }, { status: 400 })
      }

      if (!bundleId && !productBoxId) {
        console.error(`❌ [Webhook] No bundle or product box ID in metadata for session: ${session.id}`)
        return NextResponse.json({ error: "Missing item ID" }, { status: 400 })
      }

      // Get creator details and Stripe account ID
      let creatorData = null
      let creatorStripeAccountId = null
      try {
        const creatorDoc = await db.collection("users").doc(creatorId).get()
        if (creatorDoc.exists) {
          creatorData = creatorDoc.data()!
          creatorStripeAccountId = creatorData.stripeAccountId
          console.log(`✅ [Webhook] Creator found: ${creatorData.displayName} (Stripe: ${creatorStripeAccountId})`)
        } else {
          console.error(`❌ [Webhook] Creator not found: ${creatorId}`)
        }
      } catch (error) {
        console.error(`❌ [Webhook] Error fetching creator:`, error)
      }

      // Get buyer details if authenticated
      let buyerData = null
      if (buyerUid && buyerUid !== "anonymous") {
        try {
          const buyerDoc = await db.collection("users").doc(buyerUid).get()
          if (buyerDoc.exists) {
            buyerData = buyerDoc.data()!
            console.log(`✅ [Webhook] Buyer found: ${buyerData.displayName}`)
          }
        } catch (error) {
          console.error(`❌ [Webhook] Error fetching buyer:`, error)
        }
      }

      // Get item details
      const itemId = bundleId || productBoxId
      const itemType = bundleId ? "bundles" : "productBoxes"
      let itemData = null

      try {
        const itemDoc = await db.collection(itemType).doc(itemId).get()
        if (itemDoc.exists) {
          itemData = itemDoc.data()!
          console.log(`✅ [Webhook] Item found: ${itemData.title}`)
        } else {
          console.error(`❌ [Webhook] Item not found: ${itemId} in ${itemType}`)
        }
      } catch (error) {
        console.error(`❌ [Webhook] Error fetching item:`, error)
      }

      // Create purchase record
      const purchaseData = {
        // Session info
        sessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,

        // Item info
        bundleId: bundleId || null,
        productBoxId: productBoxId || null,
        itemId: itemId,
        itemType: bundleId ? "bundle" : "product_box",
        itemTitle: itemData?.title || "Unknown Item",
        itemDescription: itemData?.description || "",
        itemThumbnail: itemData?.thumbnailUrl || itemData?.customPreviewThumbnail || "",

        // Creator info
        creatorId: creatorId,
        creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
        creatorUsername: creatorData?.username || "",
        creatorStripeAccountId: creatorStripeAccountId, // 🎯 KEY: Store creator's Stripe account ID

        // Buyer info
        buyerUid: buyerUid,
        userId: buyerUid, // Alias for compatibility
        userEmail: session.customer_details?.email || buyerData?.email || "",
        userName: buyerData?.displayName || session.customer_details?.name || "Anonymous User",
        isAuthenticated: buyerUid !== "anonymous",

        // Payment info
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        paymentStatus: session.payment_status,

        // Status and timestamps
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),

        // Webhook tracking
        webhookProcessed: true,
        webhookEventId: event.id,
        webhookEventType: event.type,
        webhookProcessedAt: new Date(),
      }

      // Save purchase to bundlePurchases collection
      await db.collection("bundlePurchases").doc(session.id).set(purchaseData)
      console.log(`✅ [Webhook] Purchase created: ${session.id}`)

      // Also save to user's purchases subcollection if authenticated
      if (buyerUid && buyerUid !== "anonymous") {
        await db.collection("userPurchases").doc(buyerUid).collection("purchases").doc(session.id).set(purchaseData)
        console.log(`✅ [Webhook] Purchase added to user's collection: ${buyerUid}`)
      }

      console.log(`🎉 [Webhook] Purchase fulfillment completed for session: ${session.id}`)
      return NextResponse.json({
        received: true,
        message: "Purchase processed successfully",
        purchaseId: session.id,
      })
    }

    // Handle other event types
    console.log(`ℹ️ [Webhook] Unhandled event type: ${event.type}`)
    return NextResponse.json({ received: true, message: `Unhandled event type: ${event.type}` })
  } catch (error: any) {
    console.error("❌ [Webhook] Error processing webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed", details: error.message }, { status: 500 })
  }
}
