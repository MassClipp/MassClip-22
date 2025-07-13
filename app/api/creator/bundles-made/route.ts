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

// Bundle Made interface - clean structure for new collection
interface BundleMade {
  id: string
  title: string
  description: string
  price: number
  currency: string
  type: "one_time" | "subscription"
  coverImage?: string
  active: boolean

  // Creator info
  creatorId: string
  creatorUsername?: string
  creatorName?: string

  // Content with full metadata stored directly
  contentItems: ContentItemFull[]
  contentCount: number

  // Bundle statistics
  totalDuration: number
  totalSize: number
  contentBreakdown: {
    videos: number
    audio: number
    images: number
    documents: number
  }

  // Quick access arrays
  contentTitles: string[]
  contentUrls: string[]
  contentThumbnails: string[]

  // Timestamps
  createdAt: Date
  updatedAt: Date

  // Stripe integration
  stripeProductId?: string
  stripePriceId?: string
}

// Full content item with all metadata
interface ContentItemFull {
  id: string
  title: string
  filename: string
  fileUrl: string
  publicUrl: string
  thumbnailUrl?: string

  // File metadata
  mimeType: string
  fileSize: number
  fileSizeFormatted: string

  // Media specific
  duration?: number
  durationFormatted?: string
  resolution?: string
  width?: number
  height?: number
  quality?: string

  // Content type
  contentType: "video" | "audio" | "image" | "document"

  // Upload info
  uploadedAt: Date
  creatorId: string

  // Additional
  description?: string
  tags?: string[]
  isPublic: boolean
}

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

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

function getContentType(mimeType: string): "video" | "audio" | "image" | "document" {
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}

// Fetch content from uploads collection and convert to full metadata
async function fetchContentFromUploads(contentId: string): Promise<ContentItemFull | null> {
  try {
    console.log(`🔍 [BundlesMade] Fetching content from uploads: ${contentId}`)

    // Try direct document lookup first
    const uploadDoc = await db.collection("uploads").doc(contentId).get()

    if (!uploadDoc.exists) {
      console.log(`❌ [BundlesMade] Upload not found: ${contentId}`)
      return null
    }

    const data = uploadDoc.data()!
    console.log(`✅ [BundlesMade] Found upload data:`, {
      title: data.title,
      filename: data.filename,
      fileUrl: data.fileUrl,
      publicUrl: data.publicUrl,
      url: data.url,
      size: data.size,
      mimeType: data.mimeType,
    })

    // Extract the best available data
    const title = data.title || data.filename || "Untitled"
    const cleanTitle = title.replace(/\.(mp4|mov|avi|mkv|webm|m4v|mp3|wav|jpg|jpeg|png|gif|pdf)$/i, "")
    const fileUrl = data.fileUrl || data.publicUrl || data.url || ""
    const fileSize = data.size || data.fileSize || 0
    const mimeType = data.mimeType || data.fileType || "application/octet-stream"

    // Validate required fields
    if (!fileUrl || !fileUrl.startsWith("http")) {
      console.warn(`⚠️ [BundlesMade] Invalid fileUrl for ${contentId}: ${fileUrl}`)
      return null
    }

    const contentItem: ContentItemFull = {
      id: contentId,
      title: cleanTitle,
      filename: data.filename || cleanTitle,
      fileUrl: fileUrl,
      publicUrl: data.publicUrl || fileUrl,
      thumbnailUrl: data.thumbnailUrl || "",

      // File metadata
      mimeType: mimeType,
      fileSize: fileSize,
      fileSizeFormatted: formatFileSize(fileSize),

      // Media specific
      duration: data.duration || 0,
      durationFormatted: formatDuration(data.duration || 0),
      resolution: data.resolution || (data.height ? `${data.height}p` : undefined),
      width: data.width,
      height: data.height,
      quality: data.quality || (data.height >= 1080 ? "HD" : data.height >= 720 ? "HD" : "SD"),

      // Content type
      contentType: getContentType(mimeType),

      // Upload info
      uploadedAt: data.uploadedAt?.toDate() || data.createdAt?.toDate() || new Date(),
      creatorId: data.creatorId || data.userId || data.uid || "",

      // Additional
      description: data.description || "",
      tags: data.tags || [],
      isPublic: data.isPublic !== false,
    }

    console.log(`✅ [BundlesMade] Successfully processed content: ${contentItem.title}`)
    return contentItem
  } catch (error) {
    console.error(`❌ [BundlesMade] Error fetching content ${contentId}:`, error)
    return null
  }
}

// GET - Fetch all bundles made by the creator
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`🔍 [BundlesMade] Fetching bundles for creator: ${userId}`)

    // Query bundlesMade collection
    const bundlesQuery = db.collection("bundlesMade").where("creatorId", "==", userId).orderBy("createdAt", "desc")
    const bundlesSnapshot = await bundlesQuery.get()

    const bundles: BundleMade[] = []

    bundlesSnapshot.forEach((doc) => {
      const data = doc.data()
      bundles.push({
        id: doc.id,
        title: data.title,
        description: data.description || "",
        price: data.price,
        currency: data.currency || "usd",
        type: data.type || "one_time",
        coverImage: data.coverImage,
        active: data.active !== false,

        creatorId: data.creatorId,
        creatorUsername: data.creatorUsername,
        creatorName: data.creatorName,

        contentItems: data.contentItems || [],
        contentCount: data.contentCount || 0,

        totalDuration: data.totalDuration || 0,
        totalSize: data.totalSize || 0,
        contentBreakdown: data.contentBreakdown || { videos: 0, audio: 0, images: 0, documents: 0 },

        contentTitles: data.contentTitles || [],
        contentUrls: data.contentUrls || [],
        contentThumbnails: data.contentThumbnails || [],

        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),

        stripeProductId: data.stripeProductId,
        stripePriceId: data.stripePriceId,
      })
    })

    console.log(`✅ [BundlesMade] Found ${bundles.length} bundles`)

    return NextResponse.json({
      success: true,
      bundles,
      count: bundles.length,
    })
  } catch (error) {
    console.error("❌ [BundlesMade] Error fetching bundles:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// POST - Create a new bundle
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

    console.log(`🔍 [BundlesMade] Creating bundle for creator: ${userId}`)
    console.log(`📦 [BundlesMade] Content IDs to process:`, contentIds)

    // Get creator info
    let creatorUsername = ""
    let creatorName = ""
    try {
      const creatorDoc = await db.collection("users").doc(userId).get()
      if (creatorDoc.exists) {
        const creatorData = creatorDoc.data()!
        creatorUsername = creatorData.username || ""
        creatorName = creatorData.displayName || creatorData.name || ""
      }
    } catch (error) {
      console.warn("⚠️ [BundlesMade] Could not fetch creator info:", error)
    }

    // Fetch and process content items
    const contentItems: ContentItemFull[] = []
    const validContentIds: string[] = []

    if (contentIds.length > 0) {
      for (const contentId of contentIds) {
        const contentItem = await fetchContentFromUploads(contentId)
        if (contentItem) {
          contentItems.push(contentItem)
          validContentIds.push(contentId)
          console.log(`✅ [BundlesMade] Added content: ${contentItem.title}`)
        } else {
          console.warn(`⚠️ [BundlesMade] Skipped invalid content: ${contentId}`)
        }
      }
    }

    // Calculate bundle statistics
    const totalDuration = contentItems.reduce((sum, item) => sum + (item.duration || 0), 0)
    const totalSize = contentItems.reduce((sum, item) => sum + item.fileSize, 0)
    const videoCount = contentItems.filter((item) => item.contentType === "video").length
    const audioCount = contentItems.filter((item) => item.contentType === "audio").length
    const imageCount = contentItems.filter((item) => item.contentType === "image").length
    const documentCount = contentItems.filter((item) => item.contentType === "document").length

    // Create bundle document
    const bundleData: Omit<BundleMade, "id"> = {
      title: title.trim(),
      description: description?.trim() || "",
      price: Number(price),
      currency,
      type,
      active: true,

      creatorId: userId,
      creatorUsername,
      creatorName,

      contentItems,
      contentCount: contentItems.length,

      totalDuration,
      totalSize,
      contentBreakdown: {
        videos: videoCount,
        audio: audioCount,
        images: imageCount,
        documents: documentCount,
      },

      contentTitles: contentItems.map((item) => item.title),
      contentUrls: contentItems.map((item) => item.fileUrl),
      contentThumbnails: contentItems.map((item) => item.thumbnailUrl).filter(Boolean),

      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to bundlesMade collection
    const bundleRef = await db.collection("bundlesMade").add(bundleData)
    const bundleId = bundleRef.id

    console.log(`✅ [BundlesMade] Created bundle: ${bundleId}`)
    console.log(`📊 [BundlesMade] Bundle stats:`, {
      contentCount: contentItems.length,
      totalDuration: formatDuration(totalDuration),
      totalSize: formatFileSize(totalSize),
      contentBreakdown: bundleData.contentBreakdown,
      contentTitles: bundleData.contentTitles,
    })

    return NextResponse.json({
      success: true,
      bundleId,
      message: "Bundle created successfully in bundlesMade collection",
      bundle: {
        id: bundleId,
        ...bundleData,
      },
      stats: {
        contentItemsProcessed: contentItems.length,
        contentItemsRequested: contentIds.length,
        totalDuration: formatDuration(totalDuration),
        totalSize: formatFileSize(totalSize),
        contentTitles: bundleData.contentTitles,
      },
    })
  } catch (error) {
    console.error("❌ [BundlesMade] Error creating bundle:", error)
    return NextResponse.json(
      {
        error: "Failed to create bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
