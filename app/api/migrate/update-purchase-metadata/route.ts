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

// Helper function to get enhanced content metadata from multiple sources
async function getEnhancedContentMetadata(contentId: string): Promise<any | null> {
  try {
    console.log(`🔍 [Migration] Fetching enhanced metadata for: ${contentId}`)

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

    // 4. Try searching by uploadId in productBoxContent
    if (!contentData) {
      const uploadIdQuery = await db.collection("productBoxContent").where("uploadId", "==", contentId).limit(1).get()
      if (!uploadIdQuery.empty) {
        const doc = uploadIdQuery.docs[0]
        contentData = doc.data()
        sourceCollection = "productBoxContent (by uploadId)"

        // If we found it by uploadId, try to get the original upload data
        if (contentData.uploadId) {
          const originalUpload = await db.collection("uploads").doc(contentData.uploadId).get()
          if (originalUpload.exists) {
            contentData = { ...contentData, ...originalUpload.data() }
            sourceCollection = "uploads (via productBoxContent)"
          }
        }
      }
    }

    if (!contentData) {
      console.warn(`⚠️ [Migration] No data found for content ID: ${contentId}`)
      return null
    }

    console.log(`✅ [Migration] Found data in ${sourceCollection} for: ${contentId}`)

    // Extract and normalize all available metadata
    const mimeType = contentData.mimeType || contentData.fileType || "application/octet-stream"
    const fileSize = contentData.fileSize || contentData.size || 0
    const duration = contentData.duration || contentData.videoDuration || 0

    // Get the best available title
    const title =
      contentData.title || contentData.filename || contentData.originalFileName || contentData.name || "Untitled"

    // Clean up the title - remove file extensions
    const cleanTitle = title.replace(/\.(mp4|mov|avi|mkv|webm|m4v|mp3|wav|jpg|jpeg|png|gif|pdf)$/i, "")

    const enhancedItem = {
      // Basic identification
      id: contentId,
      title: cleanTitle,
      displayTitle: cleanTitle,
      filename: contentData.filename || contentData.originalFileName || contentData.name || `${contentId}.file`,

      // URLs - comprehensive coverage with validation
      fileUrl: contentData.fileUrl || contentData.publicUrl || contentData.downloadUrl || "",
      publicUrl: contentData.publicUrl || contentData.fileUrl || contentData.downloadUrl || "",
      downloadUrl: contentData.downloadUrl || contentData.fileUrl || contentData.publicUrl || "",
      thumbnailUrl: contentData.thumbnailUrl || contentData.previewUrl || "",
      previewUrl: contentData.previewUrl || contentData.thumbnailUrl || "",

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
    }

    console.log(`📊 [Migration] Enhanced metadata extracted:`, {
      title: enhancedItem.displayTitle,
      duration: enhancedItem.displayDuration,
      resolution: enhancedItem.resolution,
      size: enhancedItem.displaySize,
      contentType: enhancedItem.contentType,
      hasValidUrls: {
        fileUrl: !!enhancedItem.fileUrl && enhancedItem.fileUrl.startsWith("http"),
        thumbnailUrl: !!enhancedItem.thumbnailUrl,
      },
    })

    return enhancedItem
  } catch (error) {
    console.error(`❌ [Migration] Error fetching metadata for ${contentId}:`, error)
    return null
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

    console.log(`🔄 [Migration] Starting purchase metadata update for user: ${userId}`)

    // Get all user purchases
    const userPurchasesRef = db.collection("userPurchases").doc(userId).collection("purchases")
    const purchasesSnapshot = await userPurchasesRef.get()

    if (purchasesSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "No purchases found to update",
        updated: 0,
      })
    }

    let updatedCount = 0
    const updatePromises: Promise<void>[] = []

    for (const purchaseDoc of purchasesSnapshot.docs) {
      const purchaseData = purchaseDoc.data()
      const purchaseId = purchaseDoc.id

      console.log(`🔍 [Migration] Processing purchase: ${purchaseId}`)

      // Get content items from the purchase
      const contentItemIds = purchaseData.contentItems || []
      if (contentItemIds.length === 0) {
        console.log(`⚠️ [Migration] No content items found in purchase ${purchaseId}`)
        continue
      }

      // Fetch enhanced metadata for each content item
      const enhancedItems: any[] = []
      for (const contentId of contentItemIds) {
        const enhancedItem = await getEnhancedContentMetadata(contentId)
        if (enhancedItem) {
          enhancedItems.push(enhancedItem)
        }
      }

      if (enhancedItems.length === 0) {
        console.log(`⚠️ [Migration] No valid content items found for purchase ${purchaseId}`)
        continue
      }

      // Calculate updated statistics
      const totalDuration = enhancedItems.reduce((sum, item) => sum + (item.duration || 0), 0)
      const totalSize = enhancedItems.reduce((sum, item) => sum + (item.fileSize || 0), 0)
      const videoCount = enhancedItems.filter((item) => item.contentType === "video").length
      const audioCount = enhancedItems.filter((item) => item.contentType === "audio").length
      const imageCount = enhancedItems.filter((item) => item.contentType === "image").length
      const documentCount = enhancedItems.filter((item) => item.contentType === "document").length

      // Create updated purchase data
      const updatedPurchaseData = {
        ...purchaseData,
        items: enhancedItems, // Replace with enhanced items
        detailedContentItems: enhancedItems, // Also store as detailed items

        // Update content metadata
        contentMetadata: {
          totalItems: enhancedItems.length,
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
          averageDuration: enhancedItems.length > 0 ? totalDuration / enhancedItems.length : 0,
          averageSize: enhancedItems.length > 0 ? totalSize / enhancedItems.length : 0,
          resolutions: [...new Set(enhancedItems.map((item) => item.resolution).filter(Boolean))],
          formats: [...new Set(enhancedItems.map((item) => item.format).filter(Boolean))],
          qualities: [...new Set(enhancedItems.map((item) => item.quality).filter(Boolean))],
        },

        // Update quick access arrays
        itemNames: enhancedItems.map((item) => item.displayTitle),
        contentTitles: enhancedItems.map((item) => item.displayTitle),
        contentDescriptions: enhancedItems.map((item) => item.description || "").filter(Boolean),
        contentTags: [...new Set(enhancedItems.flatMap((item) => item.tags || []))],

        // Update counts
        totalItems: enhancedItems.length,
        totalSize: totalSize,

        // Mark as updated
        metadataUpdatedAt: new Date(),
        updatedAt: new Date(),
      }

      // Queue the update
      const updatePromise = userPurchasesRef
        .doc(purchaseId)
        .update(updatedPurchaseData)
        .then(() => {
          console.log(`✅ [Migration] Updated purchase ${purchaseId} with ${enhancedItems.length} enhanced items`)
          updatedCount++
        })

      updatePromises.push(updatePromise)

      // Also update bundlePurchases collection if it exists
      const bundlePurchaseRef = db.collection("bundlePurchases").doc(purchaseId)
      const bundlePurchaseDoc = await bundlePurchaseRef.get()
      if (bundlePurchaseDoc.exists) {
        updatePromises.push(
          bundlePurchaseRef.update(updatedPurchaseData).then(() => {
            console.log(`✅ [Migration] Updated bundlePurchases ${purchaseId}`)
          }),
        )
      }
    }

    // Execute all updates
    await Promise.all(updatePromises)

    console.log(`✅ [Migration] Completed purchase metadata update. Updated ${updatedCount} purchases.`)

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedCount} purchases with enhanced metadata`,
      updated: updatedCount,
      totalProcessed: purchasesSnapshot.size,
    })
  } catch (error) {
    console.error("❌ [Migration] Error updating purchase metadata:", error)
    return NextResponse.json(
      {
        error: "Failed to update purchase metadata",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
