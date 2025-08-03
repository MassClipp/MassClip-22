import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-server"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed:`, err.message)
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  console.log(`🎯 Processing webhook event: ${event.type}`)

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      default:
        console.log(`🤷‍♂️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`❌ Error processing webhook:`, error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`💳 Processing checkout session: ${session.id}`)

  const metadata = session.metadata
  if (!metadata) {
    console.error("❌ No metadata found in session")
    return
  }

  const { itemType, itemId, buyerUid, creatorId } = metadata

  if (itemType === "bundle") {
    await processBundlePurchase(session, itemId, buyerUid, creatorId)
  } else if (itemType === "product_box") {
    await processProductBoxPurchase(session, itemId, buyerUid, creatorId)
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`💰 Processing payment intent: ${paymentIntent.id}`)
  // Handle payment intent logic if needed
}

async function processBundlePurchase(
  session: Stripe.Checkout.Session,
  bundleId: string,
  buyerUid: string,
  creatorId: string,
) {
  console.log(`📦 Processing bundle purchase: ${bundleId}`)

  try {
    // Fetch complete bundle data from Firestore
    const bundleRef = db.collection("bundles").doc(bundleId)
    const bundleDoc = await bundleRef.get()

    if (!bundleDoc.exists) {
      console.error(`❌ Bundle not found: ${bundleId}`)
      return
    }

    const bundleData = bundleDoc.data()!
    console.log(`✅ Found bundle data for: ${bundleData.title}`)

    // Fetch detailed content items if they exist
    let detailedContentItems = bundleData.detailedContentItems || []

    // If detailedContentItems is empty but contentItems exists, fetch the content details
    if (detailedContentItems.length === 0 && bundleData.contentItems?.length > 0) {
      console.log(`🔍 Fetching detailed content for ${bundleData.contentItems.length} items`)

      detailedContentItems = await Promise.all(
        bundleData.contentItems.map(async (contentId: string) => {
          try {
            const contentDoc = await db.collection("creator_uploads").doc(contentId).get()
            if (contentDoc.exists) {
              const contentData = contentDoc.data()!
              return {
                id: contentId,
                contentType: contentData.contentType || "video",
                createdAt: contentData.createdAt,
                creatorId: contentData.creatorId,
                description: contentData.description || "",
                downloadCount: contentData.downloadCount || 0,
                downloadUrl: contentData.downloadUrl || contentData.fileUrl || contentData.publicUrl,
                duration: contentData.duration || 0,
                durationFormatted: contentData.durationFormatted || "0:00",
                fileSize: contentData.fileSize || 0,
                fileSizeFormatted: contentData.fileSizeFormatted || "0 MB",
                fileType: contentData.fileType || contentData.mimeType,
                fileUrl: contentData.fileUrl || contentData.publicUrl,
                filename: contentData.filename || contentData.title,
                format: contentData.format || "mp4",
                isPublic: contentData.isPublic !== false,
                mimeType: contentData.mimeType || contentData.fileType,
                previewUrl: contentData.previewUrl || "",
                publicUrl: contentData.publicUrl || contentData.fileUrl,
                quality: contentData.quality || "HD",
                tags: contentData.tags || [],
                thumbnailUrl: contentData.thumbnailUrl || "",
                title: contentData.title,
                uploadedAt: contentData.uploadedAt || contentData.createdAt,
                viewCount: contentData.viewCount || 0,
              }
            }
            return null
          } catch (error) {
            console.error(`❌ Error fetching content ${contentId}:`, error)
            return null
          }
        }),
      )

      // Filter out null values
      detailedContentItems = detailedContentItems.filter((item) => item !== null)
    }

    // Calculate content metadata
    const contentMetadata = calculateContentMetadata(detailedContentItems)

    // Create comprehensive purchase record with ALL bundle data
    const purchaseData = {
      // Basic purchase info
      sessionId: session.id,
      bundleId,
      buyerUid,
      creatorId,
      creatorName: bundleData.creatorName || "",
      creatorUsername: bundleData.creatorUsername || "",
      amount: (session.amount_total || 0) / 100,
      currency: session.currency || "usd",
      status: "completed",
      environment: process.env.NODE_ENV === "production" ? "live" : "test",
      purchasedAt: FieldValue.serverTimestamp(),
      accessUrl: `/bundles/${bundleId}`,

      // Complete bundle data - ALL fields from your specification
      active: bundleData.active !== false,
      contentDescriptions: bundleData.contentDescriptions || [],
      contentItems: bundleData.contentItems || [],
      contentLastUpdated: bundleData.contentLastUpdated,
      contentTags: bundleData.contentTags || [],
      contentThumbnails: bundleData.contentThumbnails || [],
      contentTitles: bundleData.contentTitles || [],
      contentUrls: bundleData.contentUrls || [],
      contents: bundleData.contents || [],
      coverImage: bundleData.coverImage || bundleData.thumbnailUrl,
      coverImageUrl: bundleData.coverImageUrl || bundleData.thumbnailUrl,
      customPreviewThumbnail: bundleData.customPreviewThumbnail || bundleData.thumbnailUrl,
      description: bundleData.description || "",
      title: bundleData.title || "",
      type: bundleData.type || "one_time",
      thumbnailUrl: bundleData.thumbnailUrl || "",
      thumbnailUploadedAt: bundleData.thumbnailUploadedAt,

      // Stripe integration fields
      price: bundleData.price || 0,
      priceId: bundleData.priceId || "",
      productId: bundleData.productId || "",
      stripeAccountId: bundleData.stripeAccountId || "",
      stripePriceId: bundleData.stripePriceId || bundleData.priceId,
      stripeProductId: bundleData.stripeProductId || bundleData.productId,

      // Detailed content items with complete metadata
      detailedContentItems,

      // Content metadata with calculated statistics
      contentMetadata: {
        ...contentMetadata,
        ...bundleData.contentMetadata,
      },

      // Timestamps
      createdAt: bundleData.createdAt,
      updatedAt: bundleData.updatedAt || FieldValue.serverTimestamp(),

      // Content count (calculated from actual items)
      contentCount: detailedContentItems.length,
    }

    // Store in bundlePurchases collection
    await db.collection("bundlePurchases").add(purchaseData)

    // Also store in unified purchases collection for easier querying
    await db.collection("purchases").add({
      ...purchaseData,
      itemType: "bundle",
      itemId: bundleId,
    })

    console.log(`✅ Bundle purchase recorded successfully for bundle: ${bundleId}`)
    console.log(`📊 Stored ${detailedContentItems.length} detailed content items`)
  } catch (error) {
    console.error(`❌ Error processing bundle purchase:`, error)
    throw error
  }
}

async function processProductBoxPurchase(
  session: Stripe.Checkout.Session,
  productBoxId: string,
  buyerUid: string,
  creatorId: string,
) {
  console.log(`📦 Processing product box purchase: ${productBoxId}`)

  try {
    // Fetch product box data
    const productBoxRef = db.collection("productBoxes").doc(productBoxId)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      console.error(`❌ Product box not found: ${productBoxId}`)
      return
    }

    const productBoxData = productBoxDoc.data()!

    const purchaseData = {
      sessionId: session.id,
      productBoxId,
      buyerUid,
      creatorId,
      creatorName: productBoxData.creatorName || "",
      creatorUsername: productBoxData.creatorUsername || "",
      title: productBoxData.title || "",
      description: productBoxData.description || "",
      thumbnailUrl: productBoxData.thumbnailUrl || "",
      amount: (session.amount_total || 0) / 100,
      currency: session.currency || "usd",
      status: "completed",
      environment: process.env.NODE_ENV === "production" ? "live" : "test",
      purchasedAt: FieldValue.serverTimestamp(),
      accessUrl: `/product-box/${productBoxId}/content`,
      contentCount: productBoxData.contentCount || 0,
    }

    await db.collection("productBoxPurchases").add(purchaseData)

    // Also store in unified purchases
    await db.collection("purchases").add({
      ...purchaseData,
      itemType: "product_box",
      itemId: productBoxId,
    })

    console.log(`✅ Product box purchase recorded successfully`)
  } catch (error) {
    console.error(`❌ Error processing product box purchase:`, error)
    throw error
  }
}

function calculateContentMetadata(detailedContentItems: any[]) {
  if (!detailedContentItems || detailedContentItems.length === 0) {
    return {
      averageDuration: 0,
      averageSize: 0,
      contentBreakdown: {
        audio: 0,
        documents: 0,
        images: 0,
        videos: 0,
      },
      formats: [],
      qualities: [],
      resolutions: [],
      totalDuration: 0,
      totalDurationFormatted: "0:00",
      totalItems: 0,
      totalSize: 0,
      totalSizeFormatted: "0 MB",
    }
  }

  const totalItems = detailedContentItems.length
  let totalDuration = 0
  let totalSize = 0
  const formats = new Set<string>()
  const qualities = new Set<string>()
  const resolutions = new Set<string>()

  const contentBreakdown = {
    audio: 0,
    documents: 0,
    images: 0,
    videos: 0,
  }

  detailedContentItems.forEach((item) => {
    // Duration
    if (item.duration) {
      totalDuration += item.duration
    }

    // File size
    if (item.fileSize) {
      totalSize += item.fileSize
    }

    // Format
    if (item.format) {
      formats.add(item.format)
    }

    // Quality
    if (item.quality) {
      qualities.add(item.quality)
    }

    // Resolution
    if (item.resolution) {
      resolutions.add(item.resolution)
    }

    // Content type breakdown
    const contentType = item.contentType || "video"
    if (contentType === "video") {
      contentBreakdown.videos++
    } else if (contentType === "audio") {
      contentBreakdown.audio++
    } else if (contentType === "image") {
      contentBreakdown.images++
    } else {
      contentBreakdown.documents++
    }
  })

  const averageDuration = totalItems > 0 ? totalDuration / totalItems : 0
  const averageSize = totalItems > 0 ? totalSize / totalItems : 0

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 MB"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return {
    averageDuration,
    averageSize,
    contentBreakdown,
    formats: Array.from(formats),
    qualities: Array.from(qualities),
    resolutions: Array.from(resolutions),
    totalDuration,
    totalDurationFormatted: formatDuration(totalDuration),
    totalItems,
    totalSize,
    totalSizeFormatted: formatFileSize(totalSize),
  }
}
