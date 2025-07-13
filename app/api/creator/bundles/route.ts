import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
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
const auth = getAuth()

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
  audioSampleRate?: number
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

// Helper function to get detailed content metadata
async function getDetailedContentMetadata(contentId: string): Promise<DetailedContentItem | null> {
  try {
    console.log(`🔍 [Bundle Content] Fetching detailed metadata for: ${contentId}`)

    // Try multiple sources for content data
    let contentData: any = null
    let sourceCollection = ""

    // 1. Try uploads collection first (most comprehensive)
    const uploadsDoc = await db.collection("uploads").doc(contentId).get()
    if (uploadsDoc.exists) {
      contentData = uploadsDoc.data()
      sourceCollection = "uploads"
      console.log(`✅ [Bundle Content] Found in uploads collection:`, {
        title: contentData.title,
        filename: contentData.filename,
        url: contentData.url,
        fileType: contentData.fileType,
      })
    }

    // 2. Try productBoxContent collection
    if (!contentData) {
      const productBoxContentDoc = await db.collection("productBoxContent").doc(contentId).get()
      if (productBoxContentDoc.exists) {
        contentData = productBoxContentDoc.data()
        sourceCollection = "productBoxContent"

        // If we have an uploadId, try to get the original upload data
        if (contentData.uploadId) {
          const originalUpload = await db.collection("uploads").doc(contentData.uploadId).get()
          if (originalUpload.exists) {
            const originalData = originalUpload.data()
            contentData = { ...contentData, ...originalData }
            sourceCollection = "uploads (via productBoxContent)"
            console.log(`✅ [Bundle Content] Found original upload data via productBoxContent:`, {
              title: originalData.title,
              filename: originalData.filename,
              url: originalData.url,
            })
          }
        }
      }
    }

    // 3. Try creatorUploads collection
    if (!contentData) {
      const creatorUploadsQuery = await db.collection("creatorUploads").where("id", "==", contentId).limit(1).get()
      if (!creatorUploadsQuery.empty) {
        contentData = creatorUploadsQuery.docs[0].data()
        sourceCollection = "creatorUploads"
      }
    }

    // 4. Try searching by ID in uploads collection with different field names
    if (!contentData) {
      const uploadsQuery = await db.collection("uploads").where("id", "==", contentId).limit(1).get()
      if (!uploadsQuery.empty) {
        contentData = uploadsQuery.docs[0].data()
        sourceCollection = "uploads (by id field)"
      }
    }

    if (!contentData) {
      console.warn(`⚠️ [Bundle Content] No data found for content ID: ${contentId}`)
      return null
    }

    console.log(`✅ [Bundle Content] Found data in ${sourceCollection} for: ${contentId}`)

    // Extract and normalize all available metadata
    const mimeType = contentData.mimeType || contentData.fileType || "application/octet-stream"
    const fileSize = contentData.fileSize || contentData.size || 0
    const duration = contentData.duration || contentData.videoDuration || 0

    // Get the best available title and clean it
    const rawTitle =
      contentData.title || contentData.filename || contentData.originalFileName || contentData.name || "Untitled"
    const cleanTitle = rawTitle.replace(/\.(mp4|mov|avi|mkv|webm|m4v|mp3|wav|jpg|jpeg|png|gif|pdf)$/i, "")

    // Get the best available URLs - prioritize different URL fields
    const fileUrl = contentData.url || contentData.fileUrl || contentData.publicUrl || contentData.downloadUrl || ""
    const thumbnailUrl = contentData.thumbnailUrl || contentData.previewUrl || ""

    // Validate URLs
    if (!fileUrl || !fileUrl.startsWith("http")) {
      console.warn(`⚠️ [Bundle Content] Invalid file URL for ${contentId}: ${fileUrl}`)
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
      creatorId: contentData.creatorId || contentData.userId || "",

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

    console.log(`📊 [Bundle Content] Detailed metadata extracted:`, {
      title: detailedItem.displayTitle,
      duration: detailedItem.displayDuration,
      resolution: detailedItem.resolution,
      size: detailedItem.displaySize,
      contentType: detailedItem.contentType,
      fileUrl: detailedItem.fileUrl,
      thumbnailUrl: detailedItem.thumbnailUrl,
      source: sourceCollection,
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

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`🔍 [Bundles API] Fetching bundles for user: ${userId}`)

    // Query bundles collection
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

        // Quick access arrays for easy querying
        contentTitles: detailedContentItems.map((item) => item.displayTitle),
        contentDescriptions: detailedContentItems.map((item) => item.description || "").filter(Boolean),
        contentTags: [...new Set(detailedContentItems.flatMap((item) => item.tags || []))],
        contentUrls: detailedContentItems.map((item) => item.fileUrl),
        contentThumbnails: detailedContentItems.map((item) => item.thumbnailUrl).filter(Boolean),

        // Timestamps
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        productId: data.productId || null,
        priceId: data.priceId || null,
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

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const body = await request.json()
    const { title, description, price, currency = "usd", type = "one_time", contentIds = [] } = body

    if (!title || !price) {
      return NextResponse.json({ error: "Title and price are required" }, { status: 400 })
    }

    console.log(`🔍 [Bundles API] Creating bundle for user: ${userId} with ${contentIds.length} content items`)

    // Get detailed metadata for initial content items if provided
    const detailedContentItems: DetailedContentItem[] = []
    const validContentIds: string[] = []

    if (contentIds.length > 0) {
      for (const contentId of contentIds) {
        const detailedItem = await getDetailedContentMetadata(contentId)
        if (detailedItem) {
          detailedContentItems.push(detailedItem)
          validContentIds.push(contentId)
          console.log(`✅ [Bundles API] Added detailed metadata for: ${detailedItem.displayTitle}`)
        } else {
          console.warn(`⚠️ [Bundles API] Skipping invalid content: ${contentId}`)
        }
      }
    }

    // Calculate bundle statistics
    const totalDuration = detailedContentItems.reduce((sum, item) => sum + (item.duration || 0), 0)
    const totalSize = detailedContentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0)
    const videoCount = detailedContentItems.filter((item) => item.contentType === "video").length
    const audioCount = detailedContentItems.filter((item) => item.contentType === "audio").length
    const imageCount = detailedContentItems.filter((item) => item.contentType === "image").length
    const documentCount = detailedContentItems.filter((item) => item.contentType === "document").length

    // Create bundle document with enhanced structure and comprehensive metadata
    const bundleData = {
      title: title.trim(),
      description: description?.trim() || "",
      price: Number(price),
      currency,
      type,
      creatorId: userId,
      active: true,

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

    console.log(
      `✅ [Bundles API] Created enhanced bundle: ${bundleId} with ${detailedContentItems.length} detailed content items`,
    )

    return NextResponse.json({
      success: true,
      bundleId,
      message: "Bundle created successfully with comprehensive metadata",
      contentItemsAdded: detailedContentItems.length,
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
