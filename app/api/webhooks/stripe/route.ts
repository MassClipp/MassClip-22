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

    const { productBoxId, bundleId, buyerUid, buyerEmail, buyerName, creatorId, contentType } = session.metadata || {}

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

    console.log("✅ [Webhook] Session metadata extracted:", {
      itemId,
      buyerUid,
      buyerEmail,
      contentType,
    })

    // Check if this purchase already exists
    const existingPurchase = await db.collection("bundlePurchases").doc(session.id).get()
    if (existingPurchase.exists) {
      console.log("⚠️ [Webhook] Purchase already processed:", session.id)
      return
    }

    // Determine if this is a bundle or product box
    const isBundle = contentType === "bundle" || !!bundleId
    const collection = isBundle ? "bundles" : "productBoxes"

    // Get item details with ALL bundle information
    const itemDoc = await db.collection(collection).doc(itemId).get()
    if (!itemDoc.exists) {
      console.error(`❌ [Webhook] ${collection} not found:`, itemId)
      return
    }
    const itemData = itemDoc.data()!

    console.log(`📦 [Webhook] Retrieved ${collection} data:`, {
      title: itemData.title,
      hasDetailedContentItems: !!itemData.detailedContentItems,
      contentItemsCount: itemData.detailedContentItems?.length || 0,
      hasContentMetadata: !!itemData.contentMetadata,
    })

    // Get creator details
    const actualCreatorId = creatorId || itemData.creatorId
    let creatorData = null
    if (actualCreatorId) {
      const creatorDoc = await db.collection("users").doc(actualCreatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Get comprehensive content items for this purchase
    const { contentItems, contentMetadata } = await fetchComprehensiveContentItems(itemId, isBundle, itemData)

    console.log(`📊 [Webhook] Content analysis:`, {
      totalItems: contentItems.length,
      totalSize: contentMetadata.totalSize,
      totalDuration: contentMetadata.totalDuration,
      contentBreakdown: contentMetadata.contentBreakdown,
    })

    // Create COMPREHENSIVE purchase record in bundlePurchases
    const purchaseData = {
      // User identification (buyerUid = Firebase user ID)
      buyerUid: buyerUid,
      userId: buyerUid, // Same as buyerUid for compatibility
      userEmail: buyerEmail || session.customer_email || "",
      userName: buyerName || buyerEmail?.split("@")[0] || "User",

      // Item identification
      itemId: itemId,
      bundleId: isBundle ? itemId : null,
      productBoxId: !isBundle ? itemId : null,
      itemType: isBundle ? "bundle" : "product_box",

      // Item details (preserve ALL original bundle data)
      title: itemData.title || "Untitled",
      description: itemData.description || "",
      thumbnailUrl: itemData.thumbnailUrl || itemData.customPreviewThumbnail || itemData.coverImageUrl || "",
      coverImage: itemData.coverImage || itemData.coverImageUrl || "",
      coverImageUrl: itemData.coverImageUrl || itemData.coverImage || "",
      customPreviewThumbnail: itemData.customPreviewThumbnail || "",

      // COMPREHENSIVE content details - ALL the data the user listed
      active: itemData.active !== false,
      contentDescriptions: itemData.contentDescriptions || [],
      contentItems: itemData.contentItems || [], // Original content item IDs
      contentLastUpdated: itemData.contentLastUpdated || new Date(),

      // Content metadata (calculated from actual content)
      contentMetadata: {
        averageDuration: contentMetadata.averageDuration,
        averageSize: contentMetadata.averageSize,
        contentBreakdown: contentMetadata.contentBreakdown,
        formats: contentMetadata.formats,
        qualities: contentMetadata.qualities,
        resolutions: contentMetadata.resolutions,
        totalDuration: contentMetadata.totalDuration,
        totalDurationFormatted: contentMetadata.totalDurationFormatted,
        totalItems: contentMetadata.totalItems,
        totalSize: contentMetadata.totalSize,
        totalSizeFormatted: contentMetadata.totalSizeFormatted,
      },

      contentTags: itemData.contentTags || [],
      contentThumbnails: itemData.contentThumbnails || [],
      contentTitles: contentItems.map((item) => item.title),
      contentUrls: contentItems.map((item) => item.fileUrl).filter(Boolean),

      // DETAILED content items with ALL video information
      detailedContentItems: contentItems,
      contents: contentItems, // For compatibility
      items: contentItems, // For compatibility

      // Legacy fields for compatibility
      itemNames: contentItems.map((item) => item.title),
      contentCount: contentItems.length,
      totalItems: contentItems.length,
      totalSize: contentMetadata.totalSize,

      // Purchase details
      sessionId: session.id,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || itemData.currency || "usd",
      status: "completed",
      type: itemData.type || "one_time",

      // Creator details
      creatorId: actualCreatorId || "",
      creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
      creatorUsername: creatorData?.username || "",

      // Stripe details
      price: itemData.price || 0,
      priceId: itemData.priceId || itemData.stripePriceId || "",
      productId: itemData.productId || itemData.stripeProductId || "",
      stripeAccountId: itemData.stripeAccountId || "",
      stripePriceId: itemData.stripePriceId || "",
      stripeProductId: itemData.stripeProductId || "",

      // Access
      accessUrl: `/${isBundle ? "bundles" : "product-box"}/${itemId}/content`,
      accessGranted: true,

      // Timestamps
      purchasedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      thumbnailUploadedAt: itemData.thumbnailUploadedAt || null,
      environment: isLiveKey ? "live" : "test",
    }

    console.log("💾 [Webhook] Saving COMPREHENSIVE purchase to bundlePurchases:", {
      sessionId: session.id,
      buyerUid: purchaseData.buyerUid,
      itemId: purchaseData.itemId,
      itemType: purchaseData.itemType,
      contentCount: purchaseData.contentCount,
      totalSize: purchaseData.totalSize,
      detailedItemsCount: purchaseData.detailedContentItems.length,
      hasContentMetadata: !!purchaseData.contentMetadata,
    })

    // Save to bundlePurchases collection with ALL data
    await db.collection("bundlePurchases").doc(session.id).set(purchaseData)

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

    console.log(`✅ [Webhook] Successfully processed COMPREHENSIVE purchase: ${session.id}`)
    console.log(`📊 [Webhook] Purchase includes ${purchaseData.detailedContentItems.length} detailed content items`)
  } catch (error) {
    console.error("❌ [Webhook] Error handling checkout.session.completed:", error)
    throw error
  }
}

// Fetch comprehensive content items with ALL metadata
async function fetchComprehensiveContentItems(
  itemId: string,
  isBundle: boolean,
  itemData: any,
): Promise<{
  contentItems: any[]
  contentMetadata: any
}> {
  const items: any[] = []
  const totalSize = 0
  const totalDuration = 0
  const formats = new Set<string>()
  const qualities = new Set<string>()
  const resolutions = new Set<string>()
  const contentBreakdown = { videos: 0, audio: 0, images: 0, documents: 0 }

  try {
    console.log(
      `📊 [Content Fetch] Starting comprehensive content fetch for ${isBundle ? "bundle" : "product box"}: ${itemId}`,
    )

    if (isBundle) {
      // For bundles, check if detailedContentItems already exists in the bundle
      if (itemData.detailedContentItems && Array.isArray(itemData.detailedContentItems)) {
        console.log(
          `✅ [Content Fetch] Using existing detailedContentItems from bundle (${itemData.detailedContentItems.length} items)`,
        )

        itemData.detailedContentItems.forEach((item: any) => {
          const processedItem = processContentItem(item, item.id || `item_${items.length}`)
          if (processedItem) {
            items.push(processedItem)
            updateMetadataCounters(processedItem, {
              totalSize,
              totalDuration,
              formats,
              qualities,
              resolutions,
              contentBreakdown,
            })
          }
        })
      } else if (itemData.contentItems && Array.isArray(itemData.contentItems)) {
        // Fallback: fetch individual content items by ID
        console.log(
          `📊 [Content Fetch] Fetching individual content items for bundle (${itemData.contentItems.length} IDs)`,
        )

        for (const contentItemId of itemData.contentItems) {
          try {
            const contentDoc = await db.collection("uploads").doc(contentItemId).get()
            if (contentDoc.exists) {
              const contentData = contentDoc.data()!
              const processedItem = processContentItem(contentData, contentItemId)
              if (processedItem) {
                items.push(processedItem)
                updateMetadataCounters(processedItem, {
                  totalSize,
                  totalDuration,
                  formats,
                  qualities,
                  resolutions,
                  contentBreakdown,
                })
              }
            }
          } catch (error) {
            console.warn(`⚠️ [Content Fetch] Error fetching content item ${contentItemId}:`, error)
          }
        }
      } else {
        // Last resort: treat bundle itself as the content
        console.log(`📦 [Content Fetch] Using bundle itself as content item`)
        const bundleItem = processBundleAsContent(itemData, itemId)
        if (bundleItem) {
          items.push(bundleItem)
          updateMetadataCounters(bundleItem, {
            totalSize,
            totalDuration,
            formats,
            qualities,
            resolutions,
            contentBreakdown,
          })
        }
      }
    } else {
      // For product boxes, fetch from uploads collection
      const uploadsQuery = db.collection("uploads").where("productBoxId", "==", itemId)
      const uploadsSnapshot = await uploadsQuery.get()

      console.log(`📊 [Content Fetch] Found ${uploadsSnapshot.size} uploads for product box`)

      uploadsSnapshot.forEach((doc) => {
        const data = doc.data()
        const processedItem = processContentItem(data, doc.id)
        if (processedItem) {
          items.push(processedItem)
          updateMetadataCounters(processedItem, {
            totalSize,
            totalDuration,
            formats,
            qualities,
            resolutions,
            contentBreakdown,
          })
        }
      })
    }

    // Calculate metadata
    const contentMetadata = {
      totalItems: items.length,
      totalSize: totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
      totalDuration: totalDuration,
      totalDurationFormatted: formatDuration(totalDuration),
      averageSize: items.length > 0 ? totalSize / items.length : 0,
      averageDuration: items.length > 0 ? totalDuration / items.length : 0,
      contentBreakdown: contentBreakdown,
      formats: Array.from(formats),
      qualities: Array.from(qualities),
      resolutions: Array.from(resolutions).filter(Boolean),
    }

    console.log(`✅ [Content Fetch] Comprehensive fetch complete:`, {
      totalItems: items.length,
      totalSize: contentMetadata.totalSizeFormatted,
      totalDuration: contentMetadata.totalDurationFormatted,
      contentBreakdown: contentBreakdown,
    })

    return { contentItems: items, contentMetadata }
  } catch (error) {
    console.error(`❌ [Content Fetch] Error fetching comprehensive content:`, error)
    return { contentItems: [], contentMetadata: getEmptyMetadata() }
  }
}

// Process individual content item with ALL metadata
function processContentItem(data: any, id: string): any | null {
  try {
    const fileUrl = data.fileUrl || data.downloadUrl || data.publicUrl || ""

    if (!fileUrl || !fileUrl.startsWith("http")) {
      console.warn(`⚠️ [Content Process] Skipping item ${id} - no valid URL`)
      return null
    }

    // Determine content type
    const mimeType = data.mimeType || data.fileType || "application/octet-stream"
    let contentType: "video" | "audio" | "image" | "document" = "document"

    if (mimeType.startsWith("video/")) {
      contentType = "video"
    } else if (mimeType.startsWith("audio/")) {
      contentType = "audio"
    } else if (mimeType.startsWith("image/")) {
      contentType = "image"
    }

    const title = data.title || data.filename || `Content ${id.slice(-6)}`
    const fileSize = data.fileSize || 0
    const duration = data.duration || 0

    // Extract format and quality
    const format = data.format || getFormatFromMimeType(mimeType)
    const quality = data.quality || getQualityFromData(data)

    return {
      // Basic identification
      id: id,
      title: title,
      filename: data.filename || `${title}.${format}`,
      description: data.description || "",

      // File details
      fileUrl: fileUrl,
      downloadUrl: data.downloadUrl || fileUrl,
      publicUrl: data.publicUrl || fileUrl,
      fileSize: fileSize,
      fileSizeFormatted: formatFileSize(fileSize),
      mimeType: mimeType,
      fileType: data.fileType || mimeType,

      // Content classification
      contentType: contentType,
      format: format,
      quality: quality,

      // Media metadata
      duration: duration,
      durationFormatted: formatDuration(duration),
      thumbnailUrl: data.thumbnailUrl || "",
      previewUrl: data.previewUrl || "",

      // Technical details
      width: data.width || null,
      height: data.height || null,
      resolution: data.resolution || (data.height ? `${data.height}p` : null),
      bitrate: data.bitrate || null,
      frameRate: data.frameRate || null,
      codec: data.codec || null,

      // Metadata
      tags: data.tags || [],
      isPublic: data.isPublic !== false,
      viewCount: data.viewCount || 0,
      downloadCount: data.downloadCount || 0,

      // Timestamps
      createdAt: data.createdAt || data.uploadedAt || new Date(),
      uploadedAt: data.uploadedAt || data.createdAt || new Date(),

      // Creator info
      creatorId: data.creatorId || "",
    }
  } catch (error) {
    console.error(`❌ [Content Process] Error processing item ${id}:`, error)
    return null
  }
}

// Process bundle itself as content item
function processBundleAsContent(bundleData: any, bundleId: string): any | null {
  const fileUrl = bundleData.downloadUrl || bundleData.fileUrl || ""

  if (!fileUrl) {
    return null
  }

  return {
    id: bundleId,
    title: bundleData.title || "Bundle",
    filename: `${bundleData.title || "bundle"}.zip`,
    description: bundleData.description || "",
    fileUrl: fileUrl,
    downloadUrl: fileUrl,
    fileSize: bundleData.fileSize || 0,
    fileSizeFormatted: formatFileSize(bundleData.fileSize || 0),
    mimeType: bundleData.fileType || "application/zip",
    fileType: bundleData.fileType || "application/zip",
    contentType: "document",
    format: "zip",
    quality: "Original",
    duration: 0,
    durationFormatted: "0:00",
    thumbnailUrl: bundleData.thumbnailUrl || "",
    tags: bundleData.contentTags || [],
    isPublic: bundleData.active !== false,
    createdAt: bundleData.createdAt || new Date(),
    creatorId: bundleData.creatorId || "",
  }
}

// Update metadata counters
function updateMetadataCounters(item: any, counters: any) {
  counters.totalSize += item.fileSize || 0
  counters.totalDuration += item.duration || 0

  if (item.format) counters.formats.add(item.format)
  if (item.quality) counters.qualities.add(item.quality)
  if (item.resolution) counters.resolutions.add(item.resolution)

  if (item.contentType === "video") counters.contentBreakdown.videos++
  else if (item.contentType === "audio") counters.contentBreakdown.audio++
  else if (item.contentType === "image") counters.contentBreakdown.images++
  else counters.contentBreakdown.documents++
}

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return "0:00"
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

function getFormatFromMimeType(mimeType: string): string {
  const formats: { [key: string]: string } = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/pdf": "pdf",
    "application/zip": "zip",
  }
  return formats[mimeType] || "file"
}

function getQualityFromData(data: any): string {
  if (data.quality) return data.quality
  if (data.height >= 1080) return "HD"
  if (data.height >= 720) return "HD"
  if (data.height > 0) return "SD"
  return "Original"
}

function getEmptyMetadata() {
  return {
    totalItems: 0,
    totalSize: 0,
    totalSizeFormatted: "0 Bytes",
    totalDuration: 0,
    totalDurationFormatted: "0:00",
    averageSize: 0,
    averageDuration: 0,
    contentBreakdown: { videos: 0, audio: 0, images: 0, documents: 0 },
    formats: [],
    qualities: [],
    resolutions: [],
  }
}
