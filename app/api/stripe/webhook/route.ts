import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

// Use the correct Stripe key - you only have STRIPE_SECRET_KEY
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

// Determine environment and webhook secret
const secretKey = process.env.STRIPE_SECRET_KEY!
const isProduction = process.env.NODE_ENV === "production"
const isLiveKey = secretKey?.startsWith("sk_live_")

let webhookSecret: string
if (isProduction && isLiveKey) {
  // In production with live keys, prefer live webhook secret but fallback to general
  webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET!
  console.log("🔴 [Stripe Webhook] Using webhook secret for PRODUCTION with live keys")
} else if (!isProduction && !isLiveKey) {
  // In development with test keys
  webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET!
  console.log("🟢 [Stripe Webhook] Using webhook secret for DEVELOPMENT with test keys")
} else {
  // Fallback to general webhook secret
  webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  console.log("⚠️ [Stripe Webhook] Using general webhook secret")
}

if (!webhookSecret) {
  throw new Error("Stripe webhook secret is missing. Please set STRIPE_WEBHOOK_SECRET")
}

export async function POST(request: NextRequest) {
  console.log("⚠️ [Stripe Webhook] DISABLED - Using manual verification flow only")

  return NextResponse.json({
    message: "Webhook disabled - using manual verification only",
    status: "disabled",
  })
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

    // Check if this purchase has already been processed (likely by direct verification)
    const existingPurchase = await UnifiedPurchaseService.getUserPurchase(buyerUid, session.id)
    if (existingPurchase) {
      console.log("⚠️ [Webhook] Purchase already processed (likely via direct verification):", session.id)
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
      verificationMethod: "webhook_backup", // Mark as webhook backup
      webhookProcessedAt: new Date(),
      environment: isLiveKey ? "live" : "test", // Track which environment processed this
    }

    // Write to main purchases collection with document ID as sessionId for easy lookup
    await db.collection("purchases").doc(session.id).set(mainPurchaseData)

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
      verificationMethod: "webhook_backup",
      environment: isLiveKey ? "live" : "test",
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
          platformFee: session.amount_total ? (session.amount_total * 0.25) / 100 : 0,
          netAmount: session.amount_total ? (session.amount_total * 0.75) / 100 : 0,
          purchasedAt: new Date(),
          status: "completed",
          productTitle: productBoxData.title || "Untitled Product Box",
          buyerEmail: session.customer_email || "",
          verificationMethod: "webhook_backup",
          environment: isLiveKey ? "live" : "test",
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

    console.log(
      `✅ [Webhook] Successfully processed webhook for session: ${session.id} in ${isLiveKey ? "LIVE" : "TEST"} mode`,
    )
  } catch (error) {
    console.error("❌ [Webhook] Error handling checkout.session.completed:", error)
    throw error
  }
}
