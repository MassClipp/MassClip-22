import { db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { getConnectedStripeAccount } from "@/lib/connected-stripe-accounts-service"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function processCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`💳 Processing checkout session: ${session.id}`)
  console.log(`📋 Session metadata:`, session.metadata)

  const creatorId = session.metadata?.creatorId
  const bundleId = session.metadata?.bundleId
  const buyerUid = session.metadata?.buyerUid || session.client_reference_id || ""

  if (!creatorId || !bundleId) {
    throw new Error(`Missing required metadata: creatorId=${creatorId}, bundleId=${bundleId}`)
  }

  // Check for duplicate processing
  const existingPurchase = await db.collection("bundlePurchases").doc(session.id).get()
  if (existingPurchase.exists) {
    console.log(`⚠️ Purchase already processed: ${session.id}`)
    return { alreadyProcessed: true, sessionId: session.id }
  }

  // Get creator info from users collection
  const creatorDoc = await db.collection("users").doc(creatorId).get()
  if (!creatorDoc.exists) {
    throw new Error(`Creator not found: ${creatorId}`)
  }

  const creatorData = creatorDoc.data()!

  // Get connected Stripe account from new collection
  const connectedAccount = await getConnectedStripeAccount(creatorId)
  if (!connectedAccount) {
    throw new Error(`Creator missing connected Stripe account: ${creatorId}`)
  }

  const creatorStripeAccountId = connectedAccount.stripeAccountId

  console.log(`✅ Found connected Stripe account: ${creatorStripeAccountId}`)

  // Verify session through connected account
  let verifiedSession: Stripe.Checkout.Session
  try {
    verifiedSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items", "payment_intent"],
      stripeAccount: creatorStripeAccountId,
    })
    console.log(`✅ Session verified through connected account`)
  } catch (error: any) {
    throw new Error(`Session verification failed: ${error.message}`)
  }

  // GET ALL BUNDLE INFORMATION FROM BUNDLES COLLECTION (PRIMARY SOURCE)
  const bundleDoc = await db.collection("bundles").doc(bundleId).get()
  if (!bundleDoc.exists) {
    throw new Error(`Bundle not found in bundles collection: ${bundleId}`)
  }

  const bundleData = bundleDoc.data()!
  console.log(`📦 Bundle data retrieved from bundles collection:`, {
    id: bundleId,
    title: bundleData.title,
    price: bundleData.price,
    detailedContentItemsCount: bundleData.detailedContentItems?.length || 0,
  })

  // Extract content from detailedContentItems (THE CORRECT FIELD WITH ALL DATA)
  const bundleContent = bundleData.detailedContentItems || []

  if (!Array.isArray(bundleContent) || bundleContent.length === 0) {
    console.error(`❌ No detailedContentItems found in bundle: ${bundleId}`)
    console.error(`Available fields:`, Object.keys(bundleData))
    throw new Error(`No detailedContentItems found in bundle: ${bundleId}`)
  }

  // Format content with ALL data from detailedContentItems
  const formattedBundleContent = bundleContent.map((item: any, index: number) => {
    console.log(`📄 Processing detailedContentItem ${index}:`, {
      id: item.id,
      title: item.title,
      fileUrl: item.fileUrl,
      downloadUrl: item.downloadUrl,
      fileSize: item.fileSize,
      fileSizeFormatted: item.fileSizeFormatted,
    })

    return {
      // Core identifiers
      id: item.id || `content_${index}`,

      // File URLs (use downloadUrl as primary, fileUrl as fallback)
      fileUrl: item.downloadUrl || item.fileUrl || item.publicUrl || "",
      downloadUrl: item.downloadUrl || item.fileUrl || item.publicUrl || "",
      publicUrl: item.publicUrl || item.fileUrl || "",

      // File information
      fileSize: item.fileSize || 0,
      fileSizeFormatted: item.fileSizeFormatted || formatFileSize(item.fileSize || 0),
      displaySize: item.fileSizeFormatted || formatFileSize(item.fileSize || 0),

      // Content details
      title: item.title || `Video ${index + 1}`,
      displayTitle: item.title || `Video ${index + 1}`,
      filename: item.filename || item.title || `video_${index + 1}`,
      description: item.description || "",

      // Media properties
      duration: item.duration || 0,
      durationFormatted: item.durationFormatted || "0:00",
      mimeType: item.mimeType || item.fileType || "video/mp4",
      format: item.format || "mp4",
      quality: item.quality || "HD",

      // Visual assets
      thumbnailUrl: item.thumbnailUrl || "",
      previewUrl: item.previewUrl || "",

      // Metadata
      tags: item.tags || [],
      contentType: item.contentType || "video",
      isPublic: item.isPublic || false,

      // Stats
      viewCount: item.viewCount || 0,
      downloadCount: item.downloadCount || 0,

      // Timestamps
      createdAt: item.createdAt || item.uploadedAt || null,
      uploadedAt: item.uploadedAt || null,
    }
  })

  console.log(`✅ Formatted ${formattedBundleContent.length} content items from detailedContentItems`)
  console.log(`📊 Total bundle size: ${bundleData.contentMetadata?.totalSizeFormatted || "Unknown"}`)

  // Create comprehensive purchase record with ALL bundle data
  const purchaseData = {
    // Session info
    sessionId: session.id,
    paymentIntentId:
      typeof verifiedSession.payment_intent === "string"
        ? verifiedSession.payment_intent
        : verifiedSession.payment_intent?.id || "",

    // Purchase details
    creatorId: creatorId,
    creatorStripeAccountId: creatorStripeAccountId,
    bundleId: bundleId,
    buyerUid: buyerUid,
    status: "completed",
    webhookProcessed: true,
    timestamp: FieldValue.serverTimestamp(),

    // Bundle information from bundles collection (PRIMARY SOURCE)
    bundleTitle: bundleData.title || "Untitled Bundle",
    bundleDescription: bundleData.description || "",
    bundlePrice: bundleData.price || 0,
    bundleThumbnail: bundleData.thumbnailUrl || bundleData.coverImageUrl || bundleData.customPreviewThumbnail || "",
    bundleCoverImage: bundleData.coverImage || bundleData.coverImageUrl || "",
    bundleType: bundleData.type || "one_time",
    bundleCurrency: bundleData.currency || "usd",

    // Bundle metadata from contentMetadata
    bundleContentMetadata: bundleData.contentMetadata || {},
    bundleTotalSize: bundleData.contentMetadata?.totalSize || 0,
    bundleTotalSizeFormatted: bundleData.contentMetadata?.totalSizeFormatted || "0 MB",
    bundleTotalItems: bundleData.contentMetadata?.totalItems || formattedBundleContent.length,
    bundleTotalDuration: bundleData.contentMetadata?.totalDuration || 0,
    bundleTotalDurationFormatted: bundleData.contentMetadata?.totalDurationFormatted || "0:00",

    // Content breakdown
    bundleContentBreakdown: bundleData.contentMetadata?.contentBreakdown || {},
    bundleFormats: bundleData.contentMetadata?.formats || [],
    bundleQualities: bundleData.contentMetadata?.qualities || [],

    // Content arrays for quick reference
    contentTitles: bundleData.contentTitles || [],
    contentDescriptions: bundleData.contentDescriptions || [],
    contentTags: bundleData.contentTags || [],
    contentThumbnails: bundleData.contentThumbnails || [],
    contentUrls: bundleData.contentUrls || [],

    // Content from detailedContentItems (PRIMARY SOURCE WITH ALL DATA)
    bundleContent: formattedBundleContent,
    contentCount: formattedBundleContent.length,

    // Creator info
    creatorUsername: creatorData.username || creatorData.displayName || "Unknown Creator",
    creatorDisplayName: creatorData.displayName || creatorData.username || "Unknown Creator",

    // Purchase metadata
    purchaseAmount: session.amount_total || 0,
    currency: session.currency || bundleData.currency || "usd",
    paymentStatus: session.payment_status || "paid",

    // Stripe product info
    stripeProductId: bundleData.stripeProductId || bundleData.productId || "",
    stripePriceId: bundleData.stripePriceId || bundleData.priceId || "",

    // Connected account info
    connectedAccountEmail: connectedAccount.email,
    connectedAccountChargesEnabled: connectedAccount.charges_enabled,
    connectedAccountPayoutsEnabled: connectedAccount.payouts_enabled,
    connectedAccountDetailsSubmitted: connectedAccount.details_submitted,

    // Timestamps
    bundleCreatedAt: bundleData.createdAt || null,
    bundleUpdatedAt: bundleData.updatedAt || null,
    contentLastUpdated: bundleData.contentLastUpdated || null,
  }

  // Save purchase record
  await db.collection("bundlePurchases").doc(session.id).set(purchaseData)

  console.log(`✅ Purchase processed successfully with complete bundle data:`, {
    sessionId: session.id,
    bundleId: bundleId,
    bundleTitle: bundleData.title,
    bundlePrice: bundleData.price,
    creatorId: creatorId,
    creatorStripeAccountId: creatorStripeAccountId,
    contentItems: formattedBundleContent.length,
    totalFileSize: bundleData.contentMetadata?.totalSizeFormatted || "Unknown",
    firstItemFileUrl: formattedBundleContent[0]?.fileUrl || "No URL",
  })

  return {
    success: true,
    sessionId: session.id,
    bundleId: bundleId,
    bundleTitle: bundleData.title,
    bundlePrice: bundleData.price,
    contentItems: formattedBundleContent.length,
    purchaseAmount: session.amount_total || 0,
    totalBundleSize: bundleData.contentMetadata?.totalSizeFormatted || "Unknown",
    creatorStripeAccountId: creatorStripeAccountId,
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 MB"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
