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

    // CRITICAL: Validate buyer UID exists in metadata
    const buyerUid = session.metadata?.buyerUid
    if (!buyerUid) {
      console.error("CRITICAL: Anonymous purchase detected - no buyer UID in session metadata", {
        sessionId: session.id,
        metadata: session.metadata,
      })

      // Log this as a critical error but don't fail the webhook
      await db.collection("error_logs").add({
        type: "anonymous_purchase_blocked",
        sessionId: session.id,
        metadata: session.metadata || {},
        timestamp: new Date(),
        severity: "critical",
      })

      return // Don't process anonymous purchases
    }

    // Extract metadata
    const { bundleId, creatorId } = session.metadata || {}

    if (!bundleId) {
      console.error("❌ [Webhook] Missing bundle ID in session:", session.id)
      return
    }

    console.log("✅ [Webhook] Session metadata:", { bundleId, buyerUid, creatorId })

    // Verify buyer exists in our database
    const buyerDoc = await db.collection("users").doc(buyerUid).get()
    if (!buyerDoc.exists) {
      console.error("❌ [Webhook] Buyer not found in database:", buyerUid)
      return
    }

    const buyerData = buyerDoc.data()!

    // Check if this purchase has already been processed (likely by direct verification)
    const existingPurchase = await UnifiedPurchaseService.getUserPurchase(buyerUid, session.id)
    if (existingPurchase) {
      console.log("⚠️ [Webhook] Purchase already processed (likely via direct verification):", session.id)
      return
    }

    // Get bundle details
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      console.error("❌ [Webhook] Bundle not found:", bundleId)
      return
    }

    const bundleData = bundleDoc.data()!

    // Get creator details
    const finalCreatorId = creatorId || bundleData.creatorId
    let creatorData = null
    if (finalCreatorId) {
      const creatorDoc = await db.collection("users").doc(finalCreatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Create unified purchase record with buyer UID
    await UnifiedPurchaseService.createUnifiedPurchase(buyerUid, {
      bundleId,
      sessionId: session.id,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      creatorId: finalCreatorId || "",
    })

    // Create main purchase record with buyer identification
    const mainPurchaseData = {
      userId: buyerUid, // CRITICAL: Include buyer UID
      buyerUid: buyerUid, // CRITICAL: Explicit buyer UID field
      buyerEmail: buyerData.email || session.customer_details?.email || "",
      buyerName: buyerData.displayName || buyerData.name || session.customer_details?.name || "",
      bundleId: bundleId,
      itemId: bundleId,
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      timestamp: new Date(),
      createdAt: new Date(),
      purchasedAt: new Date(),
      status: "completed",
      type: "bundle",
      itemTitle: bundleData.title || "Untitled Bundle",
      itemDescription: bundleData.description || "",
      thumbnailUrl: bundleData.thumbnailUrl || "",
      customPreviewThumbnail: bundleData.customPreviewThumbnail || "",
      creatorId: finalCreatorId,
      creatorName: creatorData?.displayName || creatorData?.name || "",
      creatorUsername: creatorData?.username || "",
      accessUrl: `/bundle/${bundleId}`,
      verificationMethod: "webhook_backup", // Mark as webhook backup
      webhookProcessedAt: new Date(),
      environment: isLiveKey ? "live" : "test", // Track which environment processed this
    }

    // Write to main purchases collection with document ID as sessionId for easy lookup
    await db.collection("purchases").doc(session.id).set(mainPurchaseData)

    // Also record in legacy purchases collection for backward compatibility
    const legacyPurchaseData = {
      ...mainPurchaseData,
      verificationMethod: "webhook_backup",
      environment: isLiveKey ? "live" : "test",
    }

    await db.collection("users").doc(buyerUid).collection("purchases").add(legacyPurchaseData)
    await db.collection("purchases").add({
      ...legacyPurchaseData,
      userId: buyerUid,
      buyerUid: buyerUid,
    })

    // Update bundle sales counter
    await db
      .collection("bundles")
      .doc(bundleId)
      .update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
        lastPurchaseAt: new Date(),
      })

    // Record the sale for the creator with buyer identification
    if (finalCreatorId) {
      await db
        .collection("users")
        .doc(finalCreatorId)
        .collection("sales")
        .add({
          bundleId: bundleId,
          buyerUid: buyerUid, // CRITICAL: Include buyer UID in sales record
          buyerEmail: buyerData.email || session.customer_details?.email || "",
          buyerName: buyerData.displayName || buyerData.name || session.customer_details?.name || "",
          sessionId: session.id,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          platformFee: session.amount_total ? (session.amount_total * 0.25) / 100 : 0,
          netAmount: session.amount_total ? (session.amount_total * 0.75) / 100 : 0,
          purchasedAt: new Date(),
          status: "completed",
          productTitle: bundleData.title || "Untitled Bundle",
          verificationMethod: "webhook_backup",
          environment: isLiveKey ? "live" : "test",
        })

      // Increment the creator's total sales
      await db
        .collection("users")
        .doc(finalCreatorId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
          lastSaleAt: new Date(),
        })
    }

    console.log(
      `✅ [Webhook] Successfully processed webhook for session: ${session.id} with buyer: ${buyerUid} in ${isLiveKey ? "LIVE" : "TEST"} mode`,
    )
  } catch (error) {
    console.error("❌ [Webhook] Error handling checkout.session.completed:", error)
    throw error
  }
}
