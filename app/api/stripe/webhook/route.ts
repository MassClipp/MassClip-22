import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("⚠️ Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      await handleCheckoutSessionCompleted(session)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error handling webhook:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log("🔍 [Webhook] Processing checkout session:", session.id)

    // Extract metadata
    const { productBoxId, buyerUid, creatorUid } = session.metadata || {}

    if (!productBoxId || !buyerUid) {
      console.error("❌ [Webhook] Missing required metadata in session:", session.id)
      return
    }

    console.log("✅ [Webhook] Session metadata:", { productBoxId, buyerUid, creatorUid })

    // Check if this purchase has already been processed
    const existingPurchase = await UnifiedPurchaseService.getUserPurchase(buyerUid, session.id)
    if (existingPurchase) {
      console.log("⚠️ [Webhook] Purchase already processed for session:", session.id)
      return
    }

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      console.error("❌ [Webhook] Product box not found:", productBoxId)
      return
    }
    const productBoxData = productBoxDoc.data()!

    // Get creator details
    const creatorId = creatorUid || productBoxData.creatorId
    let creatorData = null
    if (creatorId) {
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Create unified purchase record (this will fetch and normalize all content)
    await UnifiedPurchaseService.createUnifiedPurchase(buyerUid, {
      productBoxId,
      sessionId: session.id,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      creatorId: creatorId || "",
    })

    // Also ensure purchase is written to main purchases collection for API compatibility
    const mainPurchaseData = {
      userId: buyerUid,
      buyerUid,
      productBoxId,
      itemId: productBoxId,
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      timestamp: new Date(),
      createdAt: new Date(),
      purchasedAt: new Date(),
      status: "completed",
      type: "product_box",
      itemTitle: productBoxData.title || "Untitled Product Box",
      itemDescription: productBoxData.description || "",
      thumbnailUrl: productBoxData.thumbnailUrl || "",
      customPreviewThumbnail: productBoxData.customPreviewThumbnail || "",
      creatorId: creatorId,
      creatorName: creatorData?.displayName || creatorData?.name || "",
      creatorUsername: creatorData?.username || "",
      accessUrl: `/product-box/${productBoxId}/content`,
    }

    // Write to main purchases collection with document ID as sessionId for easy lookup
    await db.collection("purchases").doc(session.id).set(mainPurchaseData)

    console.log("✅ [Webhook] Purchase written to main collection with ID:", session.id)

    // Also record in legacy purchases collection for backward compatibility
    const legacyPurchaseData = {
      productBoxId,
      itemId: productBoxId,
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      timestamp: new Date(),
      purchasedAt: new Date(),
      status: "completed",
      type: "product_box",
      itemTitle: productBoxData.title || "Untitled Product Box",
      itemDescription: productBoxData.description || "",
      thumbnailUrl: productBoxData.thumbnailUrl || "",
      customPreviewThumbnail: productBoxData.customPreviewThumbnail || "",
      creatorId: creatorId,
      creatorName: creatorData?.displayName || creatorData?.name || "",
      creatorUsername: creatorData?.username || "",
      accessUrl: `/product-box/${productBoxId}/content`,
    }

    await db.collection("users").doc(buyerUid).collection("purchases").add(legacyPurchaseData)
    await db.collection("purchases").add({
      ...legacyPurchaseData,
      userId: buyerUid,
      buyerUid,
    })

    // Update product box sales counter
    await db
      .collection("productBoxes")
      .doc(productBoxId)
      .update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
        lastPurchaseAt: new Date(),
      })

    // Record the sale for the creator
    if (creatorId) {
      await db
        .collection("users")
        .doc(creatorId)
        .collection("sales")
        .add({
          productBoxId,
          buyerUid,
          sessionId: session.id,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          platformFee: session.amount_total ? (session.amount_total * 0.05) / 100 : 0,
          netAmount: session.amount_total ? (session.amount_total * 0.95) / 100 : 0,
          purchasedAt: new Date(),
          status: "completed",
          productTitle: productBoxData.title || "Untitled Product Box",
          buyerEmail: session.customer_email || "",
        })

      // Increment the creator's total sales
      await db
        .collection("users")
        .doc(creatorId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
          lastSaleAt: new Date(),
        })
    }

    console.log("✅ [Webhook] Successfully processed webhook for session:", session.id)
  } catch (error) {
    console.error("❌ [Webhook] Error handling checkout.session.completed:", error)
    throw error
  }
}
