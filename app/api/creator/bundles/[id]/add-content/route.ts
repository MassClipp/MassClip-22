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

// Helper function to get comprehensive content metadata
async function getComprehensiveContentMetadata(contentId: string): Promise<any | null> {
  try {
    console.log(`🔍 [Bundle Content] Fetching comprehensive metadata for: ${contentId}`)

    // Try multiple sources for content data
    let contentData: any = null
    let sourceCollection = ""

    // 1. Try uploads collection first (most comprehensive)
    const uploadsDoc = await db.collection("uploads").doc(contentId).get()
    if (uploadsDoc.exists) {
      contentData = uploadsDoc.data()
      sourceCollection = "uploads"
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
            contentData = { ...contentData, ...originalUpload.data() }
            sourceCollection = "uploads (via productBoxContent)"
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

    // Get the best available URLs
    const fileUrl = contentData.fileUrl || contentData.publicUrl || contentData.downloadUrl || ""
    const thumbnailUrl = contentData.thumbnailUrl || contentData.previewUrl || ""

    // Validate URLs
    if (!fileUrl || !fileUrl.startsWith("http")) {
      console.warn(`⚠️ [Bundle Content] Invalid file URL for ${contentId}: ${fileUrl}`)
      return null
    }

    const comprehensiveMetadata = {
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
      isPublic: contentData.isPublic !== false,
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

    console.log(`📊 [Bundle Content] Comprehensive metadata extracted:`, {
      title: comprehensiveMetadata.displayTitle,
      duration: comprehensiveMetadata.displayDuration,
      resolution: comprehensiveMetadata.resolution,
      size: comprehensiveMetadata.displaySize,
      contentType: comprehensiveMetadata.contentType,
      fileUrl: comprehensiveMetadata.fileUrl,
      thumbnailUrl: comprehensiveMetadata.thumbnailUrl,
      source: sourceCollection,
    })

    return comprehensiveMetadata
  } catch (error) {
    console.error(`❌ [Bundle Content] Error fetching metadata for ${contentId}:`, error)
    return null
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const bundleId = params.id
    const { contentIds } = await request.json()

    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return NextResponse.json({ error: "Content IDs are required" }, { status: 400 })
    }

    console.log(`🔍 [Bundle Add Content] Adding ${contentIds.length} items to bundle: ${bundleId}`)

    // Get the bundle document
    const bundleRef = db.collection("bundles").doc(bundleId)
    const bundleDoc = await bundleRef.get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!

    // Verify ownership
    if (bundleData.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized - not bundle owner" }, { status: 403 })
    }

    // Get comprehensive metadata for each content item
    const comprehensiveContentItems: any[] = []
    const validContentIds: string[] = []

    for (const contentId of contentIds) {
      const metadata = await getComprehensiveContentMetadata(contentId)
      if (metadata) {
        comprehensiveContentItems.push(metadata)
        validContentIds.push(contentId)
        console.log(`✅ [Bundle Add Content] Added comprehensive metadata for: ${metadata.displayTitle}`)
      } else {
        console.warn(`⚠️ [Bundle Add Content] Skipping invalid content: ${contentId}`)
      }
    }

    if (comprehensiveContentItems.length === 0) {
      return NextResponse.json({ error: "No valid content items found" }, { status: 400 })
    }

    // Get existing content items and merge with new ones
    const existingContentItems = bundleData.detailedContentItems || []
    const existingContentIds = bundleData.contentItems || []

    // Filter out duplicates
    const newContentItems = comprehensiveContentItems.filter((item) => !existingContentIds.includes(item.id))
    const newContentIds = newContentItems.map((item) => item.id)

    // Merge existing and new content
    const allContentItems = [...existingContentItems, ...newContentItems]
    const allContentIds = [...existingContentIds, ...newContentIds]

    // Calculate updated bundle statistics
    const totalDuration = allContentItems.reduce((sum, item) => sum + (item.duration || 0), 0)
    const totalSize = allContentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0)
    const videoCount = allContentItems.filter((item) => item.contentType === "video").length
    const audioCount = allContentItems.filter((item) => item.contentType === "audio").length
    const imageCount = allContentItems.filter((item) => item.contentType === "image").length
    const documentCount = allContentItems.filter((item) => item.contentType === "document").length

    // Update bundle with comprehensive content metadata
    const updateData = {
      // Content arrays with full metadata
      contentItems: allContentIds, // Keep for backward compatibility
      detailedContentItems: allContentItems, // Full detailed metadata
      contents: allContentItems, // Alternative field name

      // Content metadata summary
      contentMetadata: {
        totalItems: allContentItems.length,
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
        averageDuration: allContentItems.length > 0 ? totalDuration / allContentItems.length : 0,
        averageSize: allContentItems.length > 0 ? totalSize / allContentItems.length : 0,
        resolutions: [...new Set(allContentItems.map((item) => item.resolution).filter(Boolean))],
        formats: [...new Set(allContentItems.map((item) => item.format).filter(Boolean))],
        qualities: [...new Set(allContentItems.map((item) => item.quality).filter(Boolean))],
      },

      // Quick access arrays for easy querying
      contentTitles: allContentItems.map((item) => item.displayTitle),
      contentDescriptions: allContentItems.map((item) => item.description || "").filter(Boolean),
      contentTags: [...new Set(allContentItems.flatMap((item) => item.tags || []))],
      contentUrls: allContentItems.map((item) => item.fileUrl),
      contentThumbnails: allContentItems.map((item) => item.thumbnailUrl).filter(Boolean),

      // Update timestamp
      updatedAt: new Date(),
      contentLastUpdated: new Date(),
    }

    await bundleRef.update(updateData)

    console.log(`✅ [Bundle Add Content] Successfully added ${newContentItems.length} items to bundle ${bundleId}`)
    console.log(`📊 [Bundle Add Content] Bundle now contains ${allContentItems.length} total items`)

    return NextResponse.json({
      success: true,
      message: `Added ${newContentItems.length} content items to bundle`,
      addedItems: newContentItems.length,
      totalItems: allContentItems.length,
      bundleMetadata: updateData.contentMetadata,
      addedContent: newContentItems.map((item) => ({
        id: item.id,
        title: item.displayTitle,
        contentType: item.contentType,
        size: item.displaySize,
        duration: item.displayDuration,
      })),
    })
  } catch (error) {
    console.error("❌ [Bundle Add Content] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to add content to bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
