import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

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

/**
 * 🎯 SINGLE SOURCE OF TRUTH: Stripe webhook handler for ALL purchase fulfillment
 * This is the ONLY route that handles purchase fulfillment logic
 * All other purchase creation methods have been removed to prevent conflicts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(
        `✅ [Stripe Webhook] SINGLE SOURCE OF TRUTH - Signature verified for event: ${event.type} in ${isLiveKey ? "LIVE" : "TEST"} mode`,
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

    console.log(
      `🔔 [Stripe Webhook] FULFILLMENT HANDLER - Processing event: ${event.type} (${isLiveKey ? "LIVE" : "TEST"} mode)`,
    )

    // Handle checkout.session.completed event - SINGLE SOURCE OF TRUTH FOR FULFILLMENT
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      await handleCheckoutSessionCompleted(session)
    }

    // Handle other relevant events
    if (event.type === "payment_intent.succeeded") {
      console.log("💰 [Stripe Webhook] Payment intent succeeded - fulfillment handled by checkout.session.completed")
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Stripe Webhook] FULFILLMENT ERROR:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

/**
 * 🎯 SINGLE SOURCE OF TRUTH: Handle checkout session completion and fulfillment
 * This function is the ONLY place where purchase fulfillment happens
 * All other fulfillment methods have been removed
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log("🎯 [Webhook Fulfillment] SINGLE SOURCE OF TRUTH - Processing checkout session:", {
      sessionId: session.id,
      metadata: session.metadata,
    })

    const { productBoxId, bundleId, buyerUid, buyerEmail, buyerName, creatorId, contentType, stripeAccountId } =
      session.metadata || {}

    // CRITICAL: Must have buyerUid (Firebase user ID)
    if (!buyerUid) {
      console.error("❌ [Webhook Fulfillment] CRITICAL: Missing buyerUid in session metadata:", session.id)
      return
    }

    const itemId = bundleId || productBoxId
    if (!itemId) {
      console.error("❌ [Webhook Fulfillment] Missing product/bundle ID in session:", session.id)
      return
    }

    // DUPLICATE PREVENTION: Check if this purchase already exists
    const existingPurchase = await db.collection("bundlePurchases").doc(session.id).get()
    if (existingPurchase.exists) {
      console.log("⚠️ [Webhook Fulfillment] Purchase already fulfilled - PREVENTING DUPLICATE:", session.id)
      return
    }

    // If we have a connected account ID in metadata, retrieve the full session details
    let fullSession = session
    if (stripeAccountId && session.id) {
      try {
        console.log("🔗 [Webhook Fulfillment] Retrieving full session from connected account:", stripeAccountId)
        fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["payment_intent", "line_items"],
          stripeAccount: stripeAccountId,
        })
        console.log("✅ [Webhook Fulfillment] Successfully retrieved session from connected account")
      } catch (error: any) {
        console.error("❌ [Webhook Fulfillment] Failed to retrieve session from connected account:", error)
        // Continue with the session data from the webhook event
      }
    }

    console.log("✅ [Webhook Fulfillment] FULFILLMENT METADATA extracted:", {
      itemId,
      buyerUid,
      buyerEmail,
      contentType,
      stripeAccountId,
    })

    // Determine if this is a bundle or product box
    const isBundle = contentType === "bundle" || !!bundleId
    const collection = isBundle ? "bundles" : "productBoxes"

    // Get item details
    const itemDoc = await db.collection(collection).doc(itemId).get()
    if (!itemDoc.exists) {
      console.error(`❌ [Webhook Fulfillment] ${collection} not found:`, itemId)
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

    // Get content items for this purchase
    const contentItems = await fetchContentItems(itemId, isBundle)

    // Create SINGLE purchase record in bundlePurchases ONLY - SINGLE SOURCE OF TRUTH
    const purchaseData = {
      // User identification (buyerUid = Firebase user ID)
      buyerUid: buyerUid,
      userId: buyerUid, // Same as buyerUid for compatibility
      userEmail: buyerEmail || fullSession.customer_email || "",
      userName: buyerName || buyerEmail?.split("@")[0] || "User",

      // Item identification
      itemId: itemId,
      bundleId: isBundle ? itemId : null,
      productBoxId: !isBundle ? itemId : null,
      itemType: isBundle ? "bundle" : "product_box",

      // Item details
      title: itemData.title || "Untitled",
      bundleTitle: itemData.title || "Untitled", // For compatibility
      description: itemData.description || "",
      thumbnailUrl: itemData.thumbnailUrl || itemData.customPreviewThumbnail || "",

      // Content details
      contents: contentItems,
      items: contentItems,
      itemNames: contentItems.map((item) => item.displayTitle || item.title),
      contentCount: contentItems.length,
      totalItems: contentItems.length,
      totalSize: contentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0),

      // Purchase details
      sessionId: fullSession.id,
      amount: fullSession.amount_total ? fullSession.amount_total / 100 : 0,
      currency: fullSession.currency || "usd",
      status: "completed",

      // Creator details
      creatorId: actualCreatorId || "",
      creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
      creatorUsername: creatorData?.username || "",

      // Stripe details
      stripeAccountId: stripeAccountId || "",
      paymentIntentId: fullSession.payment_intent?.toString() || "",

      // Access
      accessUrl: `/${isBundle ? "bundles" : "product-box"}/${itemId}/content`,
      accessGranted: true,

      // Timestamps
      purchasedAt: new Date(),
      createdAt: new Date(),
      completedAt: new Date(),
      environment: isLiveKey ? "live" : "test",

      // Fulfillment tracking - SINGLE SOURCE OF TRUTH
      fulfilledBy: "stripe_webhook_only",
      fulfilledAt: new Date(),
      singleSourceOfTruth: true,
      verificationMethod: "stripe_webhook",

      // Metadata for tracking
      metadata: {
        webhookEvent: "checkout.session.completed",
        stripeSessionId: fullSession.id,
        fulfillmentMethod: "webhook_only",
        conflictingMethodsRemoved: true,
      },
    }

    console.log("💾 [Webhook Fulfillment] SINGLE SOURCE OF TRUTH - Saving purchase to bundlePurchases:", {
      sessionId: fullSession.id,
      buyerUid: purchaseData.buyerUid,
      itemId: purchaseData.itemId,
      itemType: purchaseData.itemType,
      contentCount: purchaseData.contentCount,
      stripeAccountId: purchaseData.stripeAccountId,
      fulfilledBy: purchaseData.fulfilledBy,
    })

    // Save to bundlePurchases collection ONLY (using sessionId as document ID) - SINGLE SOURCE OF TRUTH
    await db.collection("bundlePurchases").doc(fullSession.id).set(purchaseData)

    // Also create in unifiedPurchases for compatibility with existing UI
    const unifiedPurchaseId = `webhook_${buyerUid}_${itemId}_${Date.now()}`
    await db
      .collection("unifiedPurchases")
      .doc(unifiedPurchaseId)
      .set({
        ...purchaseData,
        id: unifiedPurchaseId,
        originalSessionId: fullSession.id,
      })

    // Update item sales counter
    await db
      .collection(collection)
      .doc(itemId)
      .update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(purchaseData.amount),
        lastPurchaseAt: new Date(),
      })

    // Update creator's total sales
    if (actualCreatorId) {
      await db
        .collection("users")
        .doc(actualCreatorId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(purchaseData.amount),
          lastSaleAt: new Date(),
        })
    }

    console.log(`🎉 [Webhook Fulfillment] SINGLE SOURCE OF TRUTH - Successfully fulfilled purchase: ${fullSession.id}`)
    console.log(`📊 [Webhook Fulfillment] Purchase details: ${contentItems.length} items, $${purchaseData.amount}`)
  } catch (error) {
    console.error("❌ [Webhook Fulfillment] FULFILLMENT ERROR:", error)
    throw error
  }
}

/**
 * Fetch content items for the purchase
 */
async function fetchContentItems(itemId: string, isBundle: boolean): Promise<any[]> {
  const items: any[] = []

  try {
    if (isBundle) {
      // For bundles, get the bundle data itself
      const bundleDoc = await db.collection("bundles").doc(itemId).get()
      if (bundleDoc.exists) {
        const bundleData = bundleDoc.data()!

        if (bundleData.downloadUrl || bundleData.fileUrl) {
          items.push({
            id: itemId,
            title: bundleData.title || "Bundle",
            displayTitle: bundleData.title || "Bundle",
            fileUrl: bundleData.downloadUrl || bundleData.fileUrl,
            fileSize: bundleData.fileSize || 0,
            displaySize: formatFileSize(bundleData.fileSize || 0),
            mimeType: bundleData.fileType || "application/zip",
            contentType: "document",
            filename: `${bundleData.title || "bundle"}.zip`,
          })
        }

        // Also check for individual content items in the bundle
        if (bundleData.contentItems && Array.isArray(bundleData.contentItems)) {
          for (const contentId of bundleData.contentItems) {
            const contentDoc = await db.collection("uploads").doc(contentId).get()
            if (contentDoc.exists) {
              const contentData = contentDoc.data()!
              if (contentData.fileUrl) {
                items.push({
                  id: contentDoc.id,
                  title: contentData.title || contentData.filename || "Untitled",
                  displayTitle: contentData.title || contentData.filename || "Untitled",
                  fileUrl: contentData.fileUrl,
                  fileSize: contentData.fileSize || 0,
                  displaySize: formatFileSize(contentData.fileSize || 0),
                  mimeType: contentData.mimeType || "video/mp4",
                  contentType: getContentType(contentData.mimeType || "video/mp4"),
                  filename: contentData.filename || `${contentDoc.id}.mp4`,
                  duration: contentData.duration || 0,
                  thumbnailUrl: contentData.thumbnailUrl || "",
                })
              }
            }
          }
        }
      }
    } else {
      // For product boxes, get all content items
      const uploadsQuery = db.collection("uploads").where("productBoxId", "==", itemId)
      const uploadsSnapshot = await uploadsQuery.get()

      uploadsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.fileUrl) {
          items.push({
            id: doc.id,
            title: data.title || data.filename || "Untitled",
            displayTitle: data.title || data.filename || "Untitled",
            fileUrl: data.fileUrl,
            fileSize: data.fileSize || 0,
            displaySize: formatFileSize(data.fileSize || 0),
            mimeType: data.mimeType || "video/mp4",
            contentType: getContentType(data.mimeType || "video/mp4"),
            filename: data.filename || `${doc.id}.mp4`,
            duration: data.duration || 0,
            thumbnailUrl: data.thumbnailUrl || "",
          })
        }
      })

      // Also check productBoxContent collection
      const productBoxContentQuery = db.collection("productBoxContent").where("productBoxId", "==", itemId)
      const productBoxContentSnapshot = await productBoxContentQuery.get()

      productBoxContentSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.fileUrl && !items.find((item) => item.id === doc.id)) {
          items.push({
            id: doc.id,
            title: data.title || data.filename || "Untitled",
            displayTitle: data.title || data.filename || "Untitled",
            fileUrl: data.fileUrl,
            fileSize: data.fileSize || 0,
            displaySize: formatFileSize(data.fileSize || 0),
            mimeType: data.mimeType || "video/mp4",
            contentType: getContentType(data.mimeType || "video/mp4"),
            filename: data.filename || `${doc.id}.mp4`,
            duration: data.duration || 0,
            thumbnailUrl: data.thumbnailUrl || "",
          })
        }
      })
    }

    console.log(
      `📦 [Content Fetch] Found ${items.length} content items for ${isBundle ? "bundle" : "product box"}: ${itemId}`,
    )
    return items
  } catch (error) {
    console.error("❌ [Content Fetch] Error fetching content items:", error)
    return []
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

function getContentType(mimeType: string): "video" | "audio" | "image" | "document" {
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}
