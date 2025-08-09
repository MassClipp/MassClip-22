import { NextRequest, NextResponse } from "next/server"
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bundleId = params.id
    const { contentIds } = await request.json()

    console.log(`📦 [Add Content] Adding content to bundle: ${bundleId}`)
    console.log(`📋 [Add Content] Content IDs:`, contentIds)

    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return NextResponse.json(
        { error: "Content IDs are required and must be a non-empty array" },
        { status: 400 }
      )
    }

    // Get bundle document
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json(
        { error: "Bundle not found" },
        { status: 404 }
      )
    }

    const bundleData = bundleDoc.data()!
    console.log(`✅ [Add Content] Bundle found: ${bundleData.title}`)

    // Get detailed content information for each content ID
    const detailedContentItems = []
    const contentMetadata = {
      totalSize: 0,
      totalDuration: 0,
      totalItems: 0,
      contentBreakdown: {
        videos: 0,
        audio: 0,
        images: 0,
        documents: 0,
      },
      formats: new Set<string>(),
      qualities: new Set<string>(),
    }

    for (const contentId of contentIds) {
      try {
        console.log(`🔍 [Add Content] Processing content ID: ${contentId}`)

        // Try to get from uploads collection first
        const uploadDoc = await db.collection("uploads").doc(contentId).get()
        if (uploadDoc.exists) {
          const uploadData = uploadDoc.data()!
          console.log(`📄 [Add Content] Found upload data for: ${uploadData.title || uploadData.filename}`)

          const fileSize = uploadData.fileSize || uploadData.size || 0
          const duration = uploadData.duration || uploadData.videoDuration || 0
          const mimeType = uploadData.mimeType || uploadData.fileType || "application/octet-stream"
          const contentType = getContentType(mimeType)
          const format = mimeType.split("/")[1] || "unknown"

          const detailedItem = {
            // Core identifiers
            id: contentId,
            uploadId: contentId,

            // File URLs
            fileUrl: uploadData.fileUrl || uploadData.downloadUrl || uploadData.publicUrl || "",
            downloadUrl: uploadData.downloadUrl || uploadData.fileUrl || uploadData.publicUrl || "",
            publicUrl: uploadData.publicUrl || uploadData.fileUrl || "",

            // File information
            filename: uploadData.filename || uploadData.originalFileName || uploadData.title || "unknown.file",
            fileSize: fileSize,
            fileSizeFormatted: formatFileSize(fileSize),
            displaySize: formatFileSize(fileSize),

            // Content details
            title: uploadData.title || uploadData.filename || uploadData.originalFileName || "Untitled",
            displayTitle: uploadData.title || uploadData.filename || uploadData.originalFileName || "Untitled",
            description: uploadData.description || "",

            // Media properties
            mimeType: mimeType,
            fileType: mimeType,
            contentType: contentType,
            format: format,
            quality: "HD",
            resolution: uploadData.resolution || "",

            // Duration
            duration: duration,
            durationFormatted: formatDuration(duration),
            displayDuration: formatDuration(duration),

            // Visual assets
            thumbnailUrl: uploadData.thumbnailUrl || "",
            previewUrl: uploadData.previewUrl || uploadData.thumbnailUrl || "",

            // Metadata
            tags: uploadData.tags || [],
            isPublic: uploadData.isPublic !== false,

            // Stats
            viewCount: uploadData.viewCount || 0,
            downloadCount: uploadData.downloadCount || 0,

            // Timestamps
            createdAt: uploadData.createdAt || uploadData.uploadedAt || new Date(),
            uploadedAt: uploadData.uploadedAt || uploadData.createdAt || new Date(),
            addedToBundleAt: new Date(),
          }

          detailedContentItems.push(detailedItem)

          // Update metadata
          contentMetadata.totalSize += fileSize
          contentMetadata.totalDuration += duration
          contentMetadata.totalItems += 1
          contentMetadata.contentBreakdown[contentType] += 1
          contentMetadata.formats.add(format)
          contentMetadata.qualities.add("HD")

          console.log(`✅ [Add Content] Added detailed item: ${detailedItem.title}`)
        } else {
          // Try creatorUploads collection as fallback
          const creatorUploadsQuery = await db
            .collection("creatorUploads")
            .where("uploadId", "==", contentId)
            .limit(1)
            .get()

          if (!creatorUploadsQuery.empty) {
            const creatorUploadDoc = creatorUploadsQuery.docs[0]
            const creatorUploadData = creatorUploadDoc.data()
            console.log(`📄 [Add Content] Found creator upload data for: ${creatorUploadData.title}`)

            const fileSize = creatorUploadData.fileSize || 0
            const duration = creatorUploadData.duration || 0
            const mimeType = creatorUploadData.mimeType || "video/mp4"
            const contentType = getContentType(mimeType)
            const format = mimeType.split("/")[1] || "mp4"

            const detailedItem = {
              // Core identifiers
              id: contentId,
              uploadId: contentId,

              // File URLs
              fileUrl: creatorUploadData.fileUrl || "",
              downloadUrl: creatorUploadData.downloadUrl || creatorUploadData.fileUrl || "",
              publicUrl: creatorUploadData.publicUrl || creatorUploadData.fileUrl || "",

              // File information
              filename: creatorUploadData.filename || creatorUploadData.title || "unknown.file",
              fileSize: fileSize,
              fileSizeFormatted: formatFileSize(fileSize),
              displaySize: formatFileSize(fileSize),

              // Content details
              title: creatorUploadData.title || "Untitled",
              displayTitle: creatorUploadData.title || "Untitled",
              description: creatorUploadData.description || "",

              // Media properties
              mimeType: mimeType,
              fileType: mimeType,
              contentType: contentType,
              format: format,
              quality: "HD",
              resolution: "",

              // Duration
              duration: duration,
              durationFormatted: formatDuration(duration),
              displayDuration: formatDuration(duration),

              // Visual assets
              thumbnailUrl: creatorUploadData.thumbnailUrl || "",
              previewUrl: creatorUploadData.previewUrl || "",

              // Metadata
              tags: creatorUploadData.tags || [],
              isPublic: true,

              // Stats
              viewCount: 0,
              downloadCount: 0,

              // Timestamps
              createdAt: creatorUploadData.createdAt || new Date(),
              uploadedAt: creatorUploadData.uploadedAt || new Date(),
              addedToBundleAt: new Date(),
            }

            detailedContentItems.push(detailedItem)

            // Update metadata
            contentMetadata.totalSize += fileSize
            contentMetadata.totalDuration += duration
            contentMetadata.totalItems += 1
            contentMetadata.contentBreakdown[contentType] += 1
            contentMetadata.formats.add(format)
            contentMetadata.qualities.add("HD")

            console.log(`✅ [Add Content] Added detailed item from creator uploads: ${detailedItem.title}`)
          } else {
            console.warn(`⚠️ [Add Content] Content not found in any collection: ${contentId}`)
          }
        }
      } catch (error) {
        console.error(`❌ [Add Content] Error processing content ${contentId}:`, error)
      }
    }

    if (detailedContentItems.length === 0) {
      return NextResponse.json(
        { error: "No valid content items found" },
        { status: 400 }
      )
    }

    // Prepare final metadata
    const finalContentMetadata = {
      totalItems: contentMetadata.totalItems,
      totalSize: contentMetadata.totalSize,
      totalSizeFormatted: formatFileSize(contentMetadata.totalSize),
      totalDuration: contentMetadata.totalDuration,
      totalDurationFormatted: formatDuration(contentMetadata.totalDuration),
      contentBreakdown: contentMetadata.contentBreakdown,
      formats: Array.from(contentMetadata.formats),
      qualities: Array.from(contentMetadata.qualities),
      lastUpdated: new Date(),
    }

    // Prepare arrays for quick access
    const contentTitles = detailedContentItems.map(item => item.title)
    const contentDescriptions = detailedContentItems.map(item => item.description).filter(Boolean)
    const contentTags = [...new Set(detailedContentItems.flatMap(item => item.tags || []))]
    const contentUrls = detailedContentItems.map(item => item.fileUrl)
    const contentThumbnails = detailedContentItems.map(item => item.thumbnailUrl).filter(Boolean)

    // Update bundle with comprehensive content data
    const updateData = {
      // Content arrays
      contentItems: contentIds,
      detailedContentItems: detailedContentItems,

      // Content metadata
      contentMetadata: finalContentMetadata,

      // Quick access arrays
      contentTitles: contentTitles,
      contentDescriptions: contentDescriptions,
      contentTags: contentTags,
      contentUrls: contentUrls,
      contentThumbnails: contentThumbnails,

      // Timestamps
      updatedAt: new Date(),
      contentLastUpdated: new Date(),
    }

    await db.collection("bundles").doc(bundleId).update(updateData)

    console.log(`✅ [Add Content] Successfully added ${detailedContentItems.length} content items to bundle`)
    console.log(`📊 [Add Content] Bundle metadata:`, {
      totalItems: finalContentMetadata.totalItems,
      totalSize: finalContentMetadata.totalSizeFormatted,
      totalDuration: finalContentMetadata.totalDurationFormatted,
      contentBreakdown: finalContentMetadata.contentBreakdown,
    })

    return NextResponse.json({
      success: true,
      message: `Added ${detailedContentItems.length} content items to bundle`,
      bundleId: bundleId,
      contentItems: detailedContentItems,
      contentMetadata: finalContentMetadata,
    })
  } catch (error) {
    console.error(`❌ [Add Content] Error adding content to bundle:`, error)
    return NextResponse.json(
      { error: "Failed to add content to bundle" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bundleId = params.id

    // Get bundle document
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json(
        { error: "Bundle not found" },
        { status: 404 }
      )
    }

    const bundleData = bundleDoc.data()!

    return NextResponse.json({
      success: true,
      bundle: {
        id: bundleId,
        title: bundleData.title,
        contentItems: bundleData.contentItems || [],
        detailedContentItems: bundleData.detailedContentItems || [],
        contentMetadata: bundleData.contentMetadata || {},
        contentTitles: bundleData.contentTitles || [],
        contentUrls: bundleData.contentUrls || [],
        contentThumbnails: bundleData.contentThumbnails || [],
      },
    })
  } catch (error) {
    console.error(`❌ [Get Bundle Content] Error:`, error)
    return NextResponse.json(
      { error: "Failed to get bundle content" },
      { status: 500 }
    )
  }
}
