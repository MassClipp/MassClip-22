import Stripe from "stripe"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

interface ContentItem {
  id: string
  title: string
  filename: string
  fileUrl: string
  downloadUrl: string
  publicUrl: string
  thumbnailUrl: string
  previewUrl: string
  mimeType: string
  fileType: string
  fileSize: number
  fileSizeFormatted: string
  displaySize: string
  duration: number
  durationFormatted: string
  displayDuration: string
  contentType: "video" | "audio" | "image" | "document"
  quality: string
  format: string
  resolution: string
  description: string
  tags: string[]
  createdAt: any
  uploadedAt: any
  isPublic: boolean
  downloadCount: number
  viewCount: number
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

// Helper function to format duration
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00"

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }
}

// Helper function to determine content type
function getContentType(mimeType: string): "video" | "audio" | "image" | "document" {
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}

// Helper function to clean object of undefined values
function cleanObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return null
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObject(item))
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanObject(value)
      }
    }
    return cleaned
  }
  
  return obj
}

// Helper function to create a clean content item
function createCleanContentItem(item: any): ContentItem {
  return {
    id: item.id || `content_${Date.now()}`,
    title: item.title || item.displayTitle || item.filename || "Untitled",
    filename: item.filename || item.title || "unknown.file",
    fileUrl: item.fileUrl || "",
    downloadUrl: item.downloadUrl || item.fileUrl || "",
    publicUrl: item.publicUrl || item.fileUrl || "",
    thumbnailUrl: item.thumbnailUrl || "",
    previewUrl: item.previewUrl || item.thumbnailUrl || "",
    mimeType: item.mimeType || "application/octet-stream",
    fileType: item.fileType || item.mimeType || "application/octet-stream",
    fileSize: item.fileSize || 0,
    fileSizeFormatted: item.fileSizeFormatted || formatFileSize(item.fileSize || 0),
    displaySize: item.displaySize || formatFileSize(item.fileSize || 0),
    duration: item.duration || 0,
    durationFormatted: item.durationFormatted || formatDuration(item.duration || 0),
    displayDuration: item.displayDuration || formatDuration(item.duration || 0),
    contentType: item.contentType || getContentType(item.mimeType || ""),
    quality: item.quality || "HD",
    format: item.format || (item.mimeType ? item.mimeType.split("/")[1] : "unknown"),
    resolution: item.resolution || "",
    description: item.description || "",
    tags: item.tags || [],
    createdAt: item.createdAt || new Date(),
    uploadedAt: item.uploadedAt || new Date(),
    isPublic: item.isPublic !== false,
    downloadCount: item.downloadCount || 0,
    viewCount: item.viewCount || 0,
  }
}

// Get comprehensive content metadata from multiple sources
async function getComprehensiveContentMetadata(bundleId: string): Promise<ContentItem[]> {
  try {
    console.log(`🔍 [Webhook] Fetching comprehensive content for bundle: ${bundleId}`)

    const contentItems: ContentItem[] = []

    // Method 1: Try to get from bundle's detailedContentItems first
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (bundleDoc.exists) {
      const bundleData = bundleDoc.data()!
      console.log(`📊 [Webhook] Bundle fields available:`, Object.keys(bundleData))

      // Check for detailedContentItems
      if (bundleData.detailedContentItems && Array.isArray(bundleData.detailedContentItems)) {
        console.log(`✅ [Webhook] Found ${bundleData.detailedContentItems.length} items in detailedContentItems`)
        
        bundleData.detailedContentItems.forEach((item: any) => {
          if (item.fileUrl && item.fileUrl.startsWith("http")) {
            const cleanItem = createCleanContentItem(item)
            contentItems.push(cleanItem)
          }
        })
      }

      // Method 2: If no detailedContentItems, try contentItems array
      if (contentItems.length === 0 && bundleData.contentItems && Array.isArray(bundleData.contentItems)) {
        console.log(`🔄 [Webhook] No detailedContentItems, trying contentItems array with ${bundleData.contentItems.length} IDs`)
        
        for (const contentId of bundleData.contentItems) {
          try {
            // Try productBoxContent collection first
            const productBoxContentQuery = await db
              .collection("productBoxContent")
              .where("productBoxId", "==", bundleId)
              .where("uploadId", "==", contentId)
              .limit(1)
              .get()

            if (!productBoxContentQuery.empty) {
              const contentDoc = productBoxContentQuery.docs[0]
              const contentData = contentDoc.data()
              
              if (contentData.fileUrl && contentData.fileUrl.startsWith("http")) {
                const cleanItem = createCleanContentItem({
                  id: contentId,
                  title: contentData.title || contentData.filename || "Untitled",
                  filename: contentData.filename || contentData.title || "unknown.file",
                  fileUrl: contentData.fileUrl,
                  downloadUrl: contentData.downloadUrl || contentData.fileUrl,
                  publicUrl: contentData.publicUrl || contentData.fileUrl,
                  thumbnailUrl: contentData.thumbnailUrl || "",
                  previewUrl: contentData.previewUrl || contentData.thumbnailUrl || "",
                  mimeType: contentData.mimeType || "application/octet-stream",
                  fileType: contentData.fileType || contentData.mimeType || "application/octet-stream",
                  fileSize: contentData.fileSize || 0,
                  duration: contentData.duration || 0,
                  contentType: getContentType(contentData.mimeType || ""),
                  quality: "HD",
                  format: contentData.mimeType ? contentData.mimeType.split("/")[1] : "unknown",
                  resolution: "",
                  description: "",
                  tags: [],
                  createdAt: contentData.createdAt || new Date(),
                  uploadedAt: contentData.uploadedAt || new Date(),
                  isPublic: true,
                  downloadCount: 0,
                  viewCount: 0,
                })
                contentItems.push(cleanItem)
              }
            } else {
              // Try uploads collection as fallback
              const uploadDoc = await db.collection("uploads").doc(contentId).get()
              if (uploadDoc.exists) {
                const uploadData = uploadDoc.data()!
                
                if (uploadData.fileUrl && uploadData.fileUrl.startsWith("http")) {
                  const cleanItem = createCleanContentItem({
                    id: contentId,
                    title: uploadData.title || uploadData.filename || uploadData.originalFileName || "Untitled",
                    filename: uploadData.filename || uploadData.originalFileName || "unknown.file",
                    fileUrl: uploadData.fileUrl,
                    downloadUrl: uploadData.downloadUrl || uploadData.fileUrl,
                    publicUrl: uploadData.publicUrl || uploadData.fileUrl,
                    thumbnailUrl: uploadData.thumbnailUrl || "",
                    previewUrl: uploadData.previewUrl || uploadData.thumbnailUrl || "",
                    mimeType: uploadData.mimeType || uploadData.fileType || "application/octet-stream",
                    fileType: uploadData.fileType || uploadData.mimeType || "application/octet-stream",
                    fileSize: uploadData.fileSize || uploadData.size || 0,
                    duration: uploadData.duration || uploadData.videoDuration || 0,
                    contentType: getContentType(uploadData.mimeType || uploadData.fileType || ""),
                    quality: "HD",
                    format: uploadData.mimeType ? uploadData.mimeType.split("/")[1] : "unknown",
                    resolution: uploadData.resolution || "",
                    description: uploadData.description || "",
                    tags: uploadData.tags || [],
                    createdAt: uploadData.createdAt || uploadData.uploadedAt || new Date(),
                    uploadedAt: uploadData.uploadedAt || uploadData.createdAt || new Date(),
                    isPublic: uploadData.isPublic !== false,
                    downloadCount: uploadData.downloadCount || 0,
                    viewCount: uploadData.viewCount || 0,
                  })
                  contentItems.push(cleanItem)
                }
              }
            }
          } catch (error) {
            console.error(`❌ [Webhook] Error fetching content ${contentId}:`, error)
          }
        }
      }
    }

    console.log(`✅ [Webhook] Found ${contentItems.length} content items for bundle ${bundleId}`)
    return contentItems
  } catch (error) {
    console.error(`❌ [Webhook] Error fetching content for bundle ${bundleId}:`, error)
    return []
  }
}

export async function processCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log(`🎯 [Webhook] Processing checkout session completed: ${session.id}`)

    // Extract bundle ID from metadata
    const bundleId = session.metadata?.bundleId || session.metadata?.productBoxId
    if (!bundleId) {
      throw new Error("No bundle ID found in session metadata")
    }

    console.log(`📦 [Webhook] Processing bundle purchase: ${bundleId}`)

    // Check for duplicate processing
    const existingPurchase = await db.collection("bundlePurchases").where("sessionId", "==", session.id).limit(1).get()
    if (!existingPurchase.empty) {
      console.log(`⚠️ [Webhook] Purchase already processed: ${session.id}`)
      return { alreadyProcessed: true, sessionId: session.id }
    }

    // Try to get bundle data - but don't fail if it doesn't exist
    let bundleData = null
    try {
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()
      if (bundleDoc.exists) {
        bundleData = bundleDoc.data()!
        console.log(`📊 [Webhook] Bundle data loaded for: ${bundleData.title}`)
      } else {
        console.warn(`⚠️ [Webhook] Bundle document not found: ${bundleId}`)
        // Try to find bundle by searching in productBoxes collection as fallback
        const productBoxQuery = await db.collection("productBoxes").where("id", "==", bundleId).limit(1).get()
        if (!productBoxQuery.empty) {
          bundleData = productBoxQuery.docs[0].data()
          console.log(`📊 [Webhook] Found bundle in productBoxes: ${bundleData.title}`)
        }
      }
    } catch (error) {
      console.error(`❌ [Webhook] Error fetching bundle ${bundleId}:`, error)
    }

    // Get comprehensive content metadata
    const contentItems = await getComprehensiveContentMetadata(bundleId)
    
    // If no content found and no bundle data, create minimal purchase record
    if (contentItems.length === 0 && !bundleData) {
      console.warn(`⚠️ [Webhook] No content items or bundle data found for: ${bundleId}`)
      console.warn(`⚠️ [Webhook] Creating minimal purchase record for session: ${session.id}`)
    }

    console.log(`✅ [Webhook] Found ${contentItems.length} content items for purchase`)

    // Calculate totals
    const totalSize = contentItems.reduce((sum, item) => sum + item.fileSize, 0)
    const totalDuration = contentItems.reduce((sum, item) => sum + (item.duration || 0), 0)
    const videoCount = contentItems.filter(item => item.contentType === "video").length
    const audioCount = contentItems.filter(item => item.contentType === "audio").length
    const imageCount = contentItems.filter(item => item.contentType === "image").length
    const documentCount = contentItems.filter(item => item.contentType === "document").length

    // Get payment intent for fee calculation
    let totalAmountCents = session.amount_total || 0
    let platformFeePercentage = 20 // 20% platform fee
    let platformFeeCents = Math.round(totalAmountCents * (platformFeePercentage / 100))
    let creatorEarningsCents = totalAmountCents - platformFeeCents

    // Try to get more detailed payment info if payment_intent is available
    if (session.payment_intent && typeof session.payment_intent === 'string') {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent)
        totalAmountCents = paymentIntent.amount
        platformFeeCents = Math.round(totalAmountCents * (platformFeePercentage / 100))
        creatorEarningsCents = totalAmountCents - platformFeeCents
      } catch (error) {
        console.warn(`⚠️ [Webhook] Could not retrieve payment intent: ${session.payment_intent}`)
      }
    }

    // Create comprehensive purchase record - clean all data before saving
    const purchaseData = cleanObject({
      // Purchase identification
      sessionId: session.id,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || "",
      bundleId: bundleId,
      
      // Bundle information (use fallback values if bundle not found)
      bundleTitle: bundleData?.title || `Bundle ${bundleId}`,
      bundleDescription: bundleData?.description || "",
      bundlePrice: bundleData?.price || (totalAmountCents / 100),
      bundleCurrency: bundleData?.currency || session.currency || "usd",
      bundleType: bundleData?.type || "one_time",
      bundleThumbnail: bundleData?.coverImage || bundleData?.thumbnailUrl || bundleData?.customPreviewThumbnail || "",
      bundleCoverImage: bundleData?.coverImage || bundleData?.thumbnailUrl || bundleData?.customPreviewThumbnail || "",
      bundleCreatedAt: bundleData?.createdAt || null,
      bundleUpdatedAt: bundleData?.updatedAt || null,
      
      // Bundle content metadata - cleaned content items
      bundleContent: contentItems,
      bundleContentMetadata: {
        totalItems: contentItems.length,
        totalSize: totalSize,
        totalSizeFormatted: formatFileSize(totalSize),
        totalDuration: totalDuration,
        totalDurationFormatted: formatDuration(totalDuration),
        contentBreakdown: {
          videos: videoCount,
          audio: audioCount,
          images: imageCount,
          documents: documentCount,
        },
        formats: [...new Set(contentItems.map(item => item.format))],
        qualities: [...new Set(contentItems.map(item => item.quality))],
      },
      bundleContentBreakdown: {
        videos: videoCount,
        audio: audioCount,
        images: imageCount,
        documents: documentCount,
      },
      bundleTotalItems: contentItems.length,
      bundleTotalSize: totalSize,
      bundleTotalSizeFormatted: formatFileSize(totalSize),
      bundleTotalDuration: totalDuration,
      bundleTotalDurationFormatted: formatDuration(totalDuration),
      bundleFormats: [...new Set(contentItems.map(item => item.format))],
      bundleQualities: [...new Set(contentItems.map(item => item.quality))],
      
      // Quick access arrays
      contentTitles: contentItems.map(item => item.title),
      contentDescriptions: contentItems.map(item => item.description).filter(Boolean),
      contentTags: [...new Set(contentItems.flatMap(item => item.tags || []))],
      contentUrls: contentItems.map(item => item.fileUrl),
      contentThumbnails: contentItems.map(item => item.thumbnailUrl).filter(Boolean),
      contentCount: contentItems.length,
      contentLastUpdated: bundleData?.contentLastUpdated || bundleData?.updatedAt || null,
      
      // Creator information
      creatorId: bundleData?.creatorId || session.metadata?.creatorId || "",
      creatorUsername: session.metadata?.creatorUsername || "",
      creatorDisplayName: session.metadata?.creatorDisplayName || "",
      creatorStripeAccountId: bundleData?.stripeAccountId || session.metadata?.stripeAccountId || "",
      
      // Buyer information
      buyerUid: session.metadata?.buyerUid || session.client_reference_id || "",
      buyerPlan: session.metadata?.buyerPlan || "free",
      
      // Payment information
      purchaseAmount: totalAmountCents,
      purchaseAmountDollars: totalAmountCents / 100,
      currency: session.currency || "usd",
      paymentStatus: session.payment_status || "paid",
      
      // Fee breakdown
      platformFeePercentage: platformFeePercentage,
      platformFeeCents: platformFeeCents,
      platformFeeDollars: platformFeeCents / 100,
      creatorEarningsCents: creatorEarningsCents,
      creatorEarningsDollars: creatorEarningsCents / 100,
      
      // Stripe information
      stripeProductId: bundleData?.stripeProductId || bundleData?.productId || "",
      stripePriceId: bundleData?.stripePriceId || bundleData?.priceId || "",
      
      // Connected account information
      connectedAccountEmail: session.metadata?.connectedAccountEmail || "",
      connectedAccountChargesEnabled: session.metadata?.connectedAccountChargesEnabled === "true",
      connectedAccountDetailsSubmitted: session.metadata?.connectedAccountDetailsSubmitted === "true",
      connectedAccountPayoutsEnabled: session.metadata?.connectedAccountPayoutsEnabled === "true",
      
      // Status and timestamps
      status: "completed",
      timestamp: new Date(),
      webhookProcessed: true,
    })

    // Save purchase record
    await db.collection("bundlePurchases").add(purchaseData)
    
    console.log(`✅ [Webhook] Purchase record created successfully for bundle: ${bundleData?.title || bundleId}`)
    console.log(`💰 [Webhook] Purchase details:`, {
      bundleTitle: bundleData?.title || bundleId,
      contentItems: contentItems.length,
      totalSize: formatFileSize(totalSize),
      totalDuration: formatDuration(totalDuration),
      purchaseAmount: `$${(totalAmountCents / 100).toFixed(2)}`,
      creatorEarnings: `$${(creatorEarningsCents / 100).toFixed(2)}`,
      platformFee: `$${(platformFeeCents / 100).toFixed(2)}`,
    })

    return {
      success: true,
      bundleId,
      contentItems: contentItems.length,
      purchaseAmount: totalAmountCents / 100,
    }
  } catch (error) {
    console.error(`❌ [Webhook] Error processing checkout session completed:`, error)
    throw error
  }
}

export async function processPaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`💳 [Webhook] Processing payment intent succeeded: ${paymentIntent.id}`)
    
    // For now, just log the payment intent
    // The main processing happens in checkout.session.completed
    console.log(`✅ [Webhook] Payment intent ${paymentIntent.id} processed successfully`)
    
    return {
      success: true,
      paymentIntentId: paymentIntent.id,
    }
  } catch (error) {
    console.error(`❌ [Webhook] Error processing payment intent succeeded:`, error)
    throw error
  }
}
