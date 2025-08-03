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

    // Handle checkout.session.completed event - SINGLE SOURCE OF TRUTH
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
    console.log("🔍 [Webhook] Processing checkout session:", {
      sessionId: session.id,
      metadata: session.metadata,
    })

    const { productBoxId, bundleId, buyerUid, buyerEmail, buyerName, creatorId, contentType, stripeAccountId } =
      session.metadata || {}

    // CRITICAL: Must have buyerUid (Firebase user ID)
    if (!buyerUid) {
      console.error("❌ [Webhook] CRITICAL: Missing buyerUid in session metadata:", session.id)
      return
    }

    const itemId = bundleId || productBoxId
    if (!itemId) {
      console.error("❌ [Webhook] Missing product/bundle ID in session:", session.id)
      return
    }

    // If we have a connected account ID in metadata, retrieve the full session details
    let fullSession = session
    if (stripeAccountId && session.id) {
      try {
        console.log("🔗 [Webhook] Retrieving full session from connected account:", stripeAccountId)
        fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["payment_intent", "line_items"],
          stripeAccount: stripeAccountId,
        })
        console.log("✅ [Webhook] Successfully retrieved session from connected account")
      } catch (error: any) {
        console.error("❌ [Webhook] Failed to retrieve session from connected account:", error)
        // Continue with the session data from the webhook event
      }
    }

    console.log("✅ [Webhook] Session metadata extracted:", {
      itemId,
      buyerUid,
      buyerEmail,
      contentType,
      stripeAccountId,
    })

    // Rest of the function remains the same...
    // Check if this purchase already exists
    const existingPurchase = await db.collection("bundlePurchases").doc(session.id).get()
    if (existingPurchase.exists) {
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

    // Get content items for this purchase
    const contentItems = await fetchContentItems(itemId, isBundle)

    // Create SINGLE purchase record in bundlePurchases ONLY
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
      description: itemData.description || "",
      thumbnailUrl: itemData.thumbnailUrl || itemData.customPreviewThumbnail || "",

      // Content details
      contents: contentItems,
      items: contentItems,
      itemNames: contentItems.map((item) => item.displayTitle),
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
      environment: isLiveKey ? "live" : "test",
    }

    console.log("💾 [Webhook] Saving purchase to bundlePurchases ONLY:", {
      sessionId: fullSession.id,
      buyerUid: purchaseData.buyerUid,
      itemId: purchaseData.itemId,
      itemType: purchaseData.itemType,
      contentCount: purchaseData.contentCount,
      stripeAccountId: purchaseData.stripeAccountId,
    })

    // Save to bundlePurchases collection ONLY (using sessionId as document ID)
    await db.collection("bundlePurchases").doc(fullSession.id).set(purchaseData)

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

    console.log(`✅ [Webhook] Successfully processed purchase: ${fullSession.id}`)
  } catch (error) {
    console.error("❌ [Webhook] Error handling checkout.session.completed:", error)
    throw error
  }
}

// Fetch content items for the purchase
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
