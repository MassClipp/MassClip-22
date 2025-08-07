import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import Stripe from "stripe"

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
const auth = getAuth()

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

// Enhanced content item interface with comprehensive metadata
interface DetailedContentItem {
  id: string
  title: string
  displayTitle: string
  filename: string
  fileUrl: string
  publicUrl: string
  downloadUrl: string
  thumbnailUrl?: string
  previewUrl?: string

  // File metadata
  mimeType: string
  fileType: string
  fileSize: number
  fileSizeFormatted: string
  displaySize: string

  // Video/Audio specific
  duration?: number
  durationFormatted?: string
  displayDuration?: string
  resolution?: string
  width?: number
  height?: number
  aspectRatio?: string
  frameRate?: number
  bitrate?: number
  codec?: string

  // Audio specific
  audioCodec?: string
  audioSampleRate?: string
  audioBitrate?: number

  // Content classification
  contentType: "video" | "audio" | "image" | "document"
  category?: string
  tags?: string[]

  // Upload metadata
  uploadedAt: any
  createdAt: any
  updatedAt?: any
  creatorId: string

  // Additional metadata
  description?: string
  isPublic: boolean
  downloadCount?: number
  viewCount?: number

  // Quality indicators
  quality?: string
  encoding?: string
  format?: string

  // Source tracking
  sourceCollection?: string
  lastUpdated?: any
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

// Helper function to get detailed content metadata - FIXED VERSION
async function getDetailedContentMetadata(contentId: string): Promise<DetailedContentItem | null> {
  try {
    console.log(`🔍 [Bundle Content] Fetching detailed metadata for: ${contentId}`)

    let contentData: any = null
    let sourceCollection = ""

    // 1. Try uploads collection by document ID first (most direct approach)
    try {
      console.log(`🔍 [Bundle Content] Checking uploads collection by doc ID: ${contentId}`)
      const uploadsDoc = await db.collection("uploads").doc(contentId).get()
      if (uploadsDoc.exists) {
        contentData = uploadsDoc.data()
        sourceCollection = "uploads"
        console.log(`✅ [Bundle Content] Found in uploads collection by doc ID:`, {
          title: contentData?.title,
          filename: contentData?.filename,
          fileUrl: contentData?.fileUrl,
          publicUrl: contentData?.publicUrl,
          url: contentData?.url,
          fileType: contentData?.fileType,
          mimeType: contentData?.mimeType,
          size: contentData?.size,
        })
      } else {
        console.log(`❌ [Bundle Content] Not found in uploads by doc ID: ${contentId}`)
      }
    } catch (error) {
      console.error(`❌ [Bundle Content] Error checking uploads by doc ID:`, error)
    }

    // 2. If not found by doc ID, try searching by id field in uploads
    if (!contentData) {
      try {
        console.log(`🔍 [Bundle Content] Searching uploads collection by id field: ${contentId}`)
        const uploadsQuery = await db.collection("uploads").where("id", "==", contentId).limit(1).get()
        if (!uploadsQuery.empty) {
          contentData = uploadsQuery.docs[0].data()
          sourceCollection = "uploads (by id field)"
          console.log(`✅ [Bundle Content] Found in uploads by id field:`, {
            docId: uploadsQuery.docs[0].id,
            title: contentData?.title,
            filename: contentData?.filename,
            fileUrl: contentData?.fileUrl,
            url: contentData?.url,
          })
        } else {
          console.log(`❌ [Bundle Content] Not found in uploads by id field: ${contentId}`)
        }
      } catch (error) {
        console.error(`❌ [Bundle Content] Error searching uploads by id field:`, error)
      }
    }

    // 3. Try productBoxContent collection
    if (!contentData) {
      try {
        console.log(`🔍 [Bundle Content] Checking productBoxContent: ${contentId}`)
        const productBoxContentDoc = await db.collection("productBoxContent").doc(contentId).get()
        if (productBoxContentDoc.exists) {
          contentData = productBoxContentDoc.data()
          sourceCollection = "productBoxContent"

          // If we have an uploadId, try to get the original upload data
          if (contentData?.uploadId) {
            console.log(`🔍 [Bundle Content] Found uploadId, fetching original: ${contentData.uploadId}`)
            try {
              const originalUpload = await db.collection("uploads").doc(contentData.uploadId).get()
              if (originalUpload.exists) {
                const originalData = originalUpload.data()
                contentData = { ...contentData, ...originalData }
                sourceCollection = "uploads (via productBoxContent)"
                console.log(`✅ [Bundle Content] Enhanced with original upload data:`, {
                  title: originalData?.title,
                  filename: originalData?.filename,
                  fileUrl: originalData?.fileUrl,
                  url: originalData?.url,
                })
              }
            } catch (error) {
              console.error(`❌ [Bundle Content] Error fetching original upload:`, error)
            }
          }
        }
      } catch (error) {
        console.error(`❌ [Bundle Content] Error checking productBoxContent:`, error)
      }
    }

    // 4. Try creatorUploads collection
    if (!contentData) {
      try {
        console.log(`🔍 [Bundle Content] Checking creatorUploads: ${contentId}`)
        const creatorUploadsQuery = await db.collection("creatorUploads").where("id", "==", contentId).limit(1).get()
        if (!creatorUploadsQuery.empty) {
          contentData = creatorUploadsQuery.docs[0].data()
          sourceCollection = "creatorUploads"
          console.log(`✅ [Bundle Content] Found in creatorUploads`)
        }
      } catch (error) {
        console.error(`❌ [Bundle Content] Error checking creatorUploads:`, error)
      }
    }

    if (!contentData) {
      console.warn(`⚠️ [Bundle Content] No data found for content ID: ${contentId}`)
      return null
    }

    console.log(`✅ [Bundle Content] Found data in ${sourceCollection} for: ${contentId}`)

    // Extract and normalize all available metadata with better field mapping
    const mimeType = contentData.mimeType || contentData.fileType || "application/octet-stream"
    const fileSize = contentData.size || contentData.fileSize || 0
    const duration = contentData.duration || contentData.videoDuration || 0

    // Get the best available title and clean it
    const rawTitle =
      contentData.title || contentData.filename || contentData.originalFileName || contentData.name || "Untitled"
    const cleanTitle = rawTitle.replace(/\.(mp4|mov|avi|mkv|webm|m4v|mp3|wav|jpg|jpeg|png|gif|pdf)$/i, "")

    // Get the best available URLs - prioritize different URL fields based on what we see in the data
    const fileUrl = contentData.fileUrl || contentData.publicUrl || contentData.url || contentData.downloadUrl || ""

    const thumbnailUrl = contentData.thumbnailUrl || contentData.previewUrl || ""

    // Validate URLs
    if (!fileUrl || !fileUrl.startsWith("http")) {
      console.warn(`⚠️ [Bundle Content] Invalid file URL for ${contentId}: ${fileUrl}`)
      console.warn(`⚠️ [Bundle Content] Available URL fields:`, {
        fileUrl: contentData.fileUrl,
        publicUrl: contentData.publicUrl,
        url: contentData.url,
        downloadUrl: contentData.downloadUrl,
      })
      return null
    }

    const detailedItem: DetailedContentItem = {
      // Basic identification
      id: contentId,
      title: cleanTitle,
      displayTitle: cleanTitle,
      filename: contentData.filename || contentData.originalFileName || contentData.name || `${contentId}.file`,

      // URLs - comprehensive coverage with validation
      fileUrl: fileUrl,
      publicUrl: contentData.publicUrl || fileUrl,
      downloadUrl: contentData.downloadUrl || fileUrl,
      thumbnailUrl: thumbnailUrl,
      previewUrl: contentData.previewUrl || thumbnailUrl,

      // File metadata
      mimeType: mimeType,
      fileType: contentData.fileType || mimeType,
      fileSize: fileSize,
      fileSizeFormatted: formatFileSize(fileSize),
      displaySize: formatFileSize(fileSize),

      // Video/Audio specific metadata
      duration: duration,
      durationFormatted: formatDuration(duration),
      displayDuration: formatDuration(duration),
      resolution:
        contentData.resolution ||
        contentData.videoResolution ||
        (contentData.height ? `${contentData.height}p` : undefined),
      width: contentData.width || contentData.videoWidth,
      height: contentData.height || contentData.videoHeight,
      aspectRatio:
        contentData.aspectRatio ||
        (contentData.width && contentData.height ? `${contentData.width}:${contentData.height}` : undefined),
      frameRate: contentData.frameRate || contentData.fps,
      bitrate: contentData.bitrate || contentData.videoBitrate,
      codec: contentData.codec || contentData.videoCodec,

      // Audio specific
      audioCodec: contentData.audioCodec,
      audioSampleRate: contentData.audioSampleRate,
      audioBitrate: contentData.audioBitrate,

      // Content classification
      contentType: getContentType(mimeType),
      category: contentData.category || contentData.tag,
      tags: contentData.tags || (contentData.tag ? [contentData.tag] : []),

      // Upload metadata
      uploadedAt: contentData.uploadedAt || contentData.createdAt || new Date(),
      createdAt: contentData.createdAt || contentData.uploadedAt || new Date(),
      updatedAt: contentData.updatedAt,
      creatorId: contentData.creatorId || contentData.userId || contentData.uid || "",

      // Additional metadata
      description: contentData.description || "",
      isPublic: contentData.isPublic !== false, // Default to true
      downloadCount: contentData.downloadCount || 0,
      viewCount: contentData.viewCount || 0,

      // Quality indicators
      quality: contentData.quality || (contentData.height >= 1080 ? "HD" : contentData.height >= 720 ? "HD" : "SD"),
      encoding: contentData.encoding,
      format: contentData.format || contentData.videoFormat || mimeType.split("/")[1],

      // Source tracking
      sourceCollection: sourceCollection,
      lastUpdated: new Date(),
    }

    console.log(`📊 [Bundle Content] Detailed metadata extracted successfully:`, {
      id: detailedItem.id,
      title: detailedItem.displayTitle,
      duration: detailedItem.displayDuration,
      resolution: detailedItem.resolution,
      size: detailedItem.displaySize,
      contentType: detailedItem.contentType,
      fileUrl: detailedItem.fileUrl,
      thumbnailUrl: detailedItem.thumbnailUrl,
      source: sourceCollection,
      hasValidUrl: !!detailedItem.fileUrl && detailedItem.fileUrl.startsWith("http"),
    })

    return detailedItem
  } catch (error) {
    console.error(`❌ [Bundle Content] Error fetching metadata for ${contentId}:`, error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`🔍 [Bundles API] Fetching bundles for user: ${userId}`)

    // Query bundles collection - Remove orderBy to avoid index issues
    const bundlesRef = db.collection("bundles")
    const bundlesQuery = bundlesRef.where("creatorId", "==", userId)
    const bundlesSnapshot = await bundlesQuery.get()

    const bundles: any[] = []

    for (const doc of bundlesSnapshot.docs) {
      const data = doc.data()

      // Get detailed content metadata for each content item
      const detailedContentItems: DetailedContentItem[] = []
      const contentItemIds = data.contentItems || []

      console.log(`📦 [Bundles API] Processing ${contentItemIds.length} content items for bundle: ${doc.id}`)

      for (const contentId of contentItemIds) {
        const detailedItem = await getDetailedContentMetadata(contentId)
        if (detailedItem) {
          detailedContentItems.push(detailedItem)
          console.log(`✅ [Bundles API] Successfully added: ${detailedItem.displayTitle}`)
        } else {
          console.warn(`⚠️ [Bundles API] Failed to get metadata for: ${contentId}`)
        }
      }

      // Calculate bundle statistics
      const totalDuration = detailedContentItems.reduce((sum, item) => sum + (item.duration || 0), 0)
      const totalSize = detailedContentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0)
      const videoCount = detailedContentItems.filter((item) => item.contentType === "video").length
      const audioCount = detailedContentItems.filter((item) => item.contentType === "audio").length
      const imageCount = detailedContentItems.filter((item) => item.contentType === "image").length
      const documentCount = detailedContentItems.filter((item) => item.contentType === "document").length

      bundles.push({
        id: doc.id,
        title: data.title || "Untitled Bundle",
        description: data.description || "",
        price: data.price || 0,
        currency: data.currency || "usd",
        coverImage: data.coverImage || data.customPreviewThumbnail || null,
        active: data.active !== false,

        // Enhanced content metadata - Store full details in Firestore
        contentItems: contentItemIds, // Keep original IDs for compatibility
        detailedContentItems: detailedContentItems, // Full detailed metadata
        contents: detailedContentItems, // Alternative field name

        // Content metadata summary
        contentMetadata: {
          totalItems: detailedContentItems.length,
          totalDuration: totalDuration,
          totalDurationFormatted: formatDuration(totalDuration),
          totalSize: totalSize,
          totalSizeFormatted: formatFileSize(totalSize),
          contentBreakdown: {
            videos: videoCount,
            audio: audioCount,
            images: imageCount,
            documents: documentCount,
          },
          averageDuration: detailedContentItems.length > 0 ? totalDuration / detailedContentItems.length : 0,
          averageSize: detailedContentItems.length > 0 ? totalSize / detailedContentItems.length : 0,
          resolutions: [...new Set(detailedContentItems.map((item) => item.resolution).filter(Boolean))],
          formats: [...new Set(detailedContentItems.map((item) => item.format).filter(Boolean))],
          qualities: [...new Set(detailedContentItems.map((item) => item.quality).filter(Boolean))],
        },

        // Quick access arrays for easy querying and display
        contentTitles: detailedContentItems.map((item) => item.displayTitle),
        contentDescriptions: detailedContentItems.map((item) => item.description || "").filter(Boolean),
        contentTags: [...new Set(detailedContentItems.flatMap((item) => item.tags || []))],
        contentUrls: detailedContentItems.map((item) => item.fileUrl),
        contentThumbnails: detailedContentItems.map((item) => item.thumbnailUrl).filter(Boolean),

        // Timestamps
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,

        // Stripe integration - use consistent field names
        productId: data.productId || data.stripeProductId,
        priceId: data.priceId || data.stripePriceId,
        stripeAccountId: data.stripeAccountId,

        type: data.type || "one_time",
      })
    }

    // Sort by creation date (newest first)
    bundles.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      const aTime = a.createdAt.seconds || a.createdAt.getTime?.() / 1000 || 0
      const bTime = b.createdAt.seconds || b.createdAt.getTime?.() / 1000 || 0
      return bTime - aTime
    })

    console.log(`✅ [Bundles API] Found ${bundles.length} bundles with detailed metadata`)

    return NextResponse.json({
      success: true,
      bundles,
      count: bundles.length,
    })
  } catch (error) {
    console.error("❌ [Bundles API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get user's plan to check bundle limits
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()
    const userPlan = userData?.plan || "free"

    console.log(`🔍 [Bundles API] Creating bundle for user: ${userId}, plan: ${userPlan}`)

    // Check bundle limit for free users
    if (userPlan === "free") {
      const existingBundlesSnapshot = await db.collection("bundles").where("creatorId", "==", userId).get()
      const bundleCount = existingBundlesSnapshot.size

      if (bundleCount >= 2) {
        console.log(`❌ [Bundles API] Bundle limit reached for free user: ${bundleCount}/2`)
        return NextResponse.json(
          {
            error: "Bundle limit reached",
            message: "Free users can only create 2 bundles. Upgrade to Creator Pro for unlimited bundles.",
            currentCount: bundleCount,
            limit: 2,
          },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const { title, description, price, currency = "usd", type = "one_time", contentIds = [] } = body

    if (!title || !price) {
      return NextResponse.json({ error: "Title and price are required" }, { status: 400 })
    }

    console.log(`🔍 [Bundles API] Creating bundle for user: ${userId} with ${contentIds.length} content items`)
    console.log(`🔍 [Bundles API] Content IDs to process:`, contentIds)

    // Get user's Stripe account info
    const userDocStripe = await db.collection("users").doc(userId).get()
    const userDataStripe = userDocStripe.data()
    const stripeAccountId = userDataStripe?.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json(
        {
          error: "Stripe account not connected",
          code: "NO_STRIPE_ACCOUNT",
          message: "Please connect your Stripe account before creating bundles",
          suggestedActions: [
            "Go to Dashboard > Settings > Stripe",
            "Complete Stripe account setup",
            "Verify your account is active",
          ],
        },
        { status: 400 },
      )
    }

    // Get detailed metadata for initial content items if provided
    const detailedContentItems: DetailedContentItem[] = []
    const validContentIds: string[] = []

    if (contentIds.length > 0) {
      for (const contentId of contentIds) {
        console.log(`🔍 [Bundles API] Processing content ID: ${contentId}`)
        const detailedItem = await getDetailedContentMetadata(contentId)
        if (detailedItem) {
          detailedContentItems.push(detailedItem)
          validContentIds.push(contentId)
          console.log(`✅ [Bundles API] Successfully added: ${detailedItem.displayTitle}`)
        } else {
          console.warn(`⚠️ [Bundles API] Skipping invalid content: ${contentId}`)
        }
      }
    }

    console.log(
      `📊 [Bundles API] Successfully processed ${detailedContentItems.length} out of ${contentIds.length} content items`,
    )

    // Calculate bundle statistics
    const totalDuration = detailedContentItems.reduce((sum, item) => sum + (item.duration || 0), 0)
    const totalSize = detailedContentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0)
    const videoCount = detailedContentItems.filter((item) => item.contentType === "video").length
    const audioCount = detailedContentItems.filter((item) => item.contentType === "audio").length
    const imageCount = detailedContentItems.filter((item) => item.contentType === "image").length
    const documentCount = detailedContentItems.filter((item) => item.contentType === "document").length

    // Create Stripe product and price
    let stripeProductId: string | null = null
    let stripePriceId: string | null = null

    try {
      console.log(`💳 [Bundles API] Creating Stripe product for account: ${stripeAccountId}`)

      // Create product in connected account
      const product = await stripe.products.create(
        {
          name: title.trim(),
          description: description?.trim() || `Premium content bundle: ${title}`,
          metadata: {
            bundleId: "temp", // Will be updated after bundle creation
            creatorId: userId,
            type: "bundle",
          },
        },
        {
          stripeAccount: stripeAccountId,
        },
      )

      stripeProductId = product.id
      console.log(`✅ [Bundles API] Created Stripe product: ${stripeProductId}`)

      // Create price for the product
      const priceAmount = Math.round(Number.parseFloat(price.toString()) * 100) // Convert to cents

      const stripePrice = await stripe.prices.create(
        {
          product: stripeProductId,
          unit_amount: priceAmount,
          currency: currency.toLowerCase(),
          metadata: {
            bundleId: "temp", // Will be updated after bundle creation
            creatorId: userId,
            type: "bundle",
          },
        },
        {
          stripeAccount: stripeAccountId,
        },
      )

      stripePriceId = stripePrice.id
      console.log(`✅ [Bundles API] Created Stripe price: ${stripePriceId} for $${price}`)
    } catch (stripeError) {
      console.error("❌ [Bundles API] Stripe error:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to create Stripe product",
          code: "STRIPE_PRODUCT_CREATION_FAILED",
          message: "Could not create product in your Stripe account",
          details: stripeError instanceof Error ? stripeError.message : "Unknown Stripe error",
          suggestedActions: [
            "Check your Stripe account status",
            "Verify account is fully set up",
            "Contact support if issue persists",
          ],
        },
        { status: 500 },
      )
    }

    // Create bundle document with enhanced structure and comprehensive metadata
    const bundleData = {
      title: title.trim(),
      description: description?.trim() || "",
      price: Number(price),
      currency,
      type,
      creatorId: userId,
      active: true,

      // Stripe integration - use consistent field names
      productId: stripeProductId,
      priceId: stripePriceId,
      stripeProductId: stripeProductId, // Also store with this name for compatibility
      stripePriceId: stripePriceId, // Also store with this name for compatibility
      stripeAccountId: stripeAccountId,

      // Content arrays with full metadata stored directly in Firestore
      contentItems: validContentIds, // Array of content IDs for compatibility
      detailedContentItems: detailedContentItems, // Full detailed metadata
      contents: detailedContentItems, // Alternative field name

      // Content metadata summary
      contentMetadata: {
        totalItems: detailedContentItems.length,
        totalDuration: totalDuration,
        totalDurationFormatted: formatDuration(totalDuration),
        totalSize: totalSize,
        totalSizeFormatted: formatFileSize(totalSize),
        contentBreakdown: {
          videos: videoCount,
          audio: audioCount,
          images: imageCount,
          documents: documentCount,
        },
        averageDuration: detailedContentItems.length > 0 ? totalDuration / detailedContentItems.length : 0,
        averageSize: detailedContentItems.length > 0 ? totalSize / detailedContentItems.length : 0,
        resolutions: [...new Set(detailedContentItems.map((item) => item.resolution).filter(Boolean))],
        formats: [...new Set(detailedContentItems.map((item) => item.format).filter(Boolean))],
        qualities: [...new Set(detailedContentItems.map((item) => item.quality).filter(Boolean))],
      },

      // Quick access arrays for easy querying and display
      contentTitles: detailedContentItems.map((item) => item.displayTitle),
      contentDescriptions: detailedContentItems.map((item) => item.description || "").filter(Boolean),
      contentTags: [...new Set(detailedContentItems.flatMap((item) => item.tags || []))],
      contentUrls: detailedContentItems.map((item) => item.fileUrl),
      contentThumbnails: detailedContentItems.map((item) => item.thumbnailUrl).filter(Boolean),

      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      contentLastUpdated: new Date(),
    }

    const bundleRef = await db.collection("bundles").add(bundleData)
    const bundleId = bundleRef.id

    // Update Stripe product and price metadata with actual bundle ID
    if (stripeProductId && stripePriceId) {
      try {
        await Promise.all([
          stripe.products.update(
            stripeProductId,
            {
              metadata: {
                bundleId: bundleId,
                creatorId: userId,
                type: "bundle",
              },
            },
            {
              stripeAccount: stripeAccountId,
            },
          ),
          stripe.prices.update(
            stripePriceId,
            {
              metadata: {
                bundleId: bundleId,
                creatorId: userId,
                type: "bundle",
              },
            },
            {
              stripeAccount: stripeAccountId,
            },
          ),
        ])
        console.log(`✅ [Bundles API] Updated Stripe metadata with bundle ID: ${bundleId}`)
      } catch (updateError) {
        console.error("❌ [Bundles API] Failed to update Stripe metadata:", updateError)
        // Don't fail the entire operation for metadata update issues
      }
    }

    console.log(
      `✅ [Bundles API] Created enhanced bundle: ${bundleId} with ${detailedContentItems.length} detailed content items`,
    )

    // Log the content titles that were successfully added
    const addedTitles = detailedContentItems.map((item) => item.displayTitle)
    console.log(`📝 [Bundles API] Content titles added to bundle:`, addedTitles)

    return NextResponse.json({
      success: true,
      bundleId,
      productId: stripeProductId,
      priceId: stripePriceId,
      message: "Bundle created successfully with Stripe integration",
      contentItemsAdded: detailedContentItems.length,
      contentItemsRequested: contentIds.length,
      addedContentTitles: addedTitles,
      bundleMetadata: bundleData.contentMetadata,
    })
  } catch (error) {
    console.error("❌ [Bundles API] Error creating bundle:", error)
    return NextResponse.json(
      {
        error: "Failed to create bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
