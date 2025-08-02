import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

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

    // Handle checkout.session.completed event with buyer identification
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      await handleCheckoutSessionCompleted(session, event.account)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Stripe Webhook] Error handling webhook:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, connectedAccountId?: string) {
  try {
    console.log("🔍 [Webhook] Processing checkout session with buyer identification:", {
      sessionId: session.id,
      connectedAccount: connectedAccountId,
      metadata: session.metadata,
    })

    // Extract comprehensive buyer metadata
    const { productBoxId, bundleId, buyerUid, buyerEmail, buyerName, creatorId, isAuthenticated, contentType } =
      session.metadata || {}

    // CRITICAL: Ensure we have buyer identification
    if (!buyerUid) {
      console.error("❌ [Webhook] CRITICAL: Missing buyerUid in session metadata:", session.id)

      // Try to extract from custom fields if anonymous purchase
      let extractedBuyerEmail = ""
      if (session.custom_fields) {
        const emailField = session.custom_fields.find((field) => field.key === "buyer_email")
        if (emailField && emailField.text) {
          extractedBuyerEmail = emailField.text.value
          console.log("📧 [Webhook] Extracted buyer email from custom fields:", extractedBuyerEmail)
        }
      }

      if (!extractedBuyerEmail && !session.customer_email) {
        console.error("❌ [Webhook] Cannot identify buyer - no UID, email, or custom fields")
        return
      }

      // For anonymous purchases, use email as identifier
      const anonymousBuyerUid = `anonymous_${session.customer_email || extractedBuyerEmail}`
      console.log("🔄 [Webhook] Using anonymous buyer identifier:", anonymousBuyerUid)

      await processAnonymousPurchase(session, anonymousBuyerUid, extractedBuyerEmail || session.customer_email!)
      return
    }

    const itemId = bundleId || productBoxId
    if (!itemId) {
      console.error("❌ [Webhook] Missing product/bundle ID in session:", session.id)
      return
    }

    console.log("✅ [Webhook] Session metadata extracted:", {
      itemId,
      buyerUid,
      buyerEmail,
      buyerName,
      creatorId,
      contentType,
      isAuthenticated,
    })

    // Check if this purchase has already been processed
    const existingPurchase = await UnifiedPurchaseService.getUserPurchase(buyerUid, session.id)
    if (existingPurchase) {
      console.log("⚠️ [Webhook] Purchase already processed:", session.id)
      return
    }

    // Determine if this is a bundle or product box
    const isBundle = contentType === "bundle" || !!bundleId
    const collection = isBundle ? "bundles" : "productBoxes"

    // Get item details
    const itemDoc = await db.collection(collection).doc(itemId).get()
    if (!itemDoc.exists) {
      console.error(`❌ [Webhook] ${collection} not found:`, itemId)
      return
    }
    const itemData = itemDoc.data()!

    // Get creator details
    const actualCreatorId = creatorId || itemData.creatorId
    let creatorData = null
    if (actualCreatorId) {
      const creatorDoc = await db.collection("users").doc(actualCreatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Create unified purchase record with comprehensive buyer identification
    await UnifiedPurchaseService.createUnifiedPurchase(buyerUid, {
      [isBundle ? "bundleId" : "productBoxId"]: itemId,
      sessionId: session.id,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      creatorId: actualCreatorId || "",
      userEmail: buyerEmail || session.customer_email || "",
      userName: buyerName || buyerEmail?.split("@")[0] || "User",
    })

    // Create main purchase record with enhanced buyer identification
    const mainPurchaseData = {
      // CRITICAL: Comprehensive buyer identification
      userId: buyerUid,
      buyerUid,
      userEmail: buyerEmail || session.customer_email || "",
      userName: buyerName || buyerEmail?.split("@")[0] || "User",
      isAuthenticated: isAuthenticated === "true",

      // Item identification
      [isBundle ? "bundleId" : "productBoxId"]: itemId,
      itemId,
      sessionId: session.id,
      paymentIntentId: session.payment_intent,

      // Purchase details
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      timestamp: new Date(),
      createdAt: new Date(),
      purchasedAt: new Date(),
      status: "completed",
      type: isBundle ? "bundle" : "product_box",

      // Item details
      itemTitle: itemData.title || `Untitled ${isBundle ? "Bundle" : "Product Box"}`,
      itemDescription: itemData.description || "",
      thumbnailUrl: itemData.thumbnailUrl || itemData.customPreviewThumbnail || "",

      // Creator details
      creatorId: actualCreatorId,
      creatorName: creatorData?.displayName || creatorData?.name || "",
      creatorUsername: creatorData?.username || "",

      // Access and verification
      accessUrl: `/${isBundle ? "bundle" : "product-box"}/${itemId}/content`,
      verificationMethod: "webhook_with_buyer_metadata",
      webhookProcessedAt: new Date(),
      environment: isLiveKey ? "live" : "test",
      connectedAccountId: connectedAccountId || null,
    }

    // Save to main purchases collection with session ID as document ID
    await db.collection("purchases").doc(session.id).set(mainPurchaseData)

    // Save to user's personal purchases if authenticated
    if (buyerUid !== "anonymous" && !buyerUid.startsWith("anonymous_")) {
      await db.collection("users").doc(buyerUid).collection("purchases").add(mainPurchaseData)

      // Update user profile
      await db
        .collection("users")
        .doc(buyerUid)
        .update({
          lastPurchaseAt: new Date(),
          totalPurchases: db.FieldValue.increment(1),
          totalSpent: db.FieldValue.increment(mainPurchaseData.amount),
        })
    }

    // Update item sales counter
    await db
      .collection(collection)
      .doc(itemId)
      .update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(mainPurchaseData.amount),
        lastPurchaseAt: new Date(),
      })

    // Record the sale for the creator with buyer identification
    if (actualCreatorId) {
      await db
        .collection("users")
        .doc(actualCreatorId)
        .collection("sales")
        .add({
          ...mainPurchaseData,
          platformFee: session.amount_total ? (session.amount_total * 0.25) / 100 : 0,
          netAmount: session.amount_total ? (session.amount_total * 0.75) / 100 : 0,
          buyerIdentification: {
            buyerUid,
            buyerEmail: buyerEmail || session.customer_email || "",
            buyerName: buyerName || "User",
            isAuthenticated: isAuthenticated === "true",
          },
        })

      // Update creator's total sales
      await db
        .collection("users")
        .doc(actualCreatorId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(mainPurchaseData.amount),
          lastSaleAt: new Date(),
        })
    }

    console.log(`✅ [Webhook] Successfully processed webhook with buyer identification for session: ${session.id}`, {
      buyerUid,
      buyerEmail: buyerEmail || session.customer_email,
      itemId,
      contentType,
      environment: isLiveKey ? "LIVE" : "TEST",
    })
  } catch (error) {
    console.error("❌ [Webhook] Error handling checkout.session.completed:", error)
    throw error
  }
}

// Handle anonymous purchases with email identification
async function processAnonymousPurchase(
  session: Stripe.Checkout.Session,
  anonymousBuyerUid: string,
  buyerEmail: string,
) {
  try {
    console.log("🔄 [Webhook] Processing anonymous purchase:", { anonymousBuyerUid, buyerEmail })

    const { productBoxId, bundleId, creatorId, contentType } = session.metadata || {}
    const itemId = bundleId || productBoxId

    if (!itemId) {
      console.error("❌ [Webhook] Missing item ID for anonymous purchase")
      return
    }

    // Create purchase record for anonymous buyer
    const purchaseData = {
      userId: anonymousBuyerUid,
      buyerUid: anonymousBuyerUid,
      userEmail: buyerEmail,
      userName: buyerEmail.split("@")[0] || "Anonymous User",
      isAuthenticated: false,

      [contentType === "bundle" ? "bundleId" : "productBoxId"]: itemId,
      itemId,
      sessionId: session.id,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      status: "completed",
      type: contentType || "product_box",

      timestamp: new Date(),
      createdAt: new Date(),
      purchasedAt: new Date(),
      verificationMethod: "webhook_anonymous_with_email",
      environment: isLiveKey ? "live" : "test",
    }

    // Save anonymous purchase
    await db.collection("purchases").doc(session.id).set(purchaseData)
    await db.collection("anonymousPurchases").doc(session.id).set(purchaseData)

    console.log("✅ [Webhook] Anonymous purchase processed:", { anonymousBuyerUid, buyerEmail, itemId })
  } catch (error) {
    console.error("❌ [Webhook] Error processing anonymous purchase:", error)
  }
}
