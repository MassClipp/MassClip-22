import { type NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { UserTrackingService } from "@/lib/user-tracking-service"

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

function getContentType(mimeType: string): "video" | "audio" | "image" | "document" {
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Auth check
    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization Bearer token" }, { status: 401 })
    }
    const decoded = await getAuth().verifyIdToken(token)
    const uid = decoded.uid

    const bundleId = params.id
    const { contentIds } = await request.json()
    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return NextResponse.json({ error: "Content IDs are required and must be a non-empty array" }, { status: 400 })
    }

    // Get bundle document
    const bundleRef = db.collection("bundles").doc(bundleId)
    const bundleDoc = await bundleRef.get()
    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }
    const bundleData = bundleDoc.data() || {}

    // Determine user's tier limits
    const tier = await UserTrackingService.getUserTierInfo(uid)
    const maxPerBundle = tier.maxVideosPerBundle // null means unlimited
    const existingIds: string[] = Array.isArray(bundleData.contentItems) ? bundleData.contentItems : []
    const remaining = maxPerBundle === null ? Number.POSITIVE_INFINITY : Math.max(0, maxPerBundle - existingIds.length)

    // Only accept up to remaining items
    const idsToAdd = contentIds.slice(0, remaining as number)
    const skipped = contentIds.length - idsToAdd.length

    if (idsToAdd.length === 0) {
      return NextResponse.json(
        {
          error:
            maxPerBundle === null
              ? "No remaining capacity in this bundle."
              : `Free plan limit reached: maximum ${maxPerBundle} items per bundle.`,
        },
        { status: 400 },
      )
    }

    // Build detailed entries from uploads or creatorUploads
    const detailedContentItems: any[] = []
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

    for (const contentId of idsToAdd) {
      try {
        let uploadData: any | null = null

        const uploadDoc = await db.collection("uploads").doc(contentId).get()
        if (uploadDoc.exists) {
          uploadData = uploadDoc.data()
        } else {
          const creatorUploadsQuery = await db
            .collection("creatorUploads")
            .where("uploadId", "==", contentId)
            .limit(1)
            .get()
          if (!creatorUploadsQuery.empty) {
            uploadData = creatorUploadsQuery.docs[0].data()
          }
        }

        if (!uploadData) continue

        const fileSize = uploadData.fileSize || uploadData.size || 0
        const duration = uploadData.duration || uploadData.videoDuration || 0
        const mimeType = uploadData.mimeType || uploadData.fileType || "application/octet-stream"
        const contentType = getContentType(mimeType)
        const format = mimeType.split("/")[1] || "unknown"

        const detailedItem = {
          id: contentId,
          uploadId: contentId,
          fileUrl: uploadData.fileUrl || uploadData.downloadUrl || uploadData.publicUrl || "",
          downloadUrl: uploadData.downloadUrl || uploadData.fileUrl || uploadData.publicUrl || "",
          publicUrl: uploadData.publicUrl || uploadData.fileUrl || "",
          filename: uploadData.filename || uploadData.originalFileName || uploadData.title || "unknown.file",
          fileSize,
          fileSizeFormatted: formatFileSize(fileSize),
          title: uploadData.title || uploadData.filename || uploadData.originalFileName || "Untitled",
          displayTitle: uploadData.title || uploadData.filename || uploadData.originalFileName || "Untitled",
          description: uploadData.description || "",
          mimeType,
          fileType: mimeType,
          contentType,
          format,
          quality: "HD",
          resolution: uploadData.resolution || "",
          duration,
          durationFormatted: formatDuration(duration),
          displayDuration: formatDuration(duration),
          thumbnailUrl: uploadData.thumbnailUrl || "",
          previewUrl: uploadData.previewUrl || uploadData.thumbnailUrl || "",
          tags: uploadData.tags || [],
          isPublic: uploadData.isPublic !== false,
          viewCount: uploadData.viewCount || 0,
          downloadCount: uploadData.downloadCount || 0,
          createdAt: uploadData.createdAt || uploadData.uploadedAt || new Date(),
          uploadedAt: uploadData.uploadedAt || uploadData.createdAt || new Date(),
          addedToBundleAt: new Date(),
        }

        detailedContentItems.push(detailedItem)
        contentMetadata.totalSize += fileSize
        contentMetadata.totalDuration += duration
        contentMetadata.totalItems += 1
        contentMetadata.contentBreakdown[contentType] += 1
        contentMetadata.formats.add(format)
        contentMetadata.qualities.add("HD")
      } catch (e) {
        console.error("❌ [Add Content] Failed processing content:", contentId, e)
      }
    }

    if (detailedContentItems.length === 0) {
      return NextResponse.json({ error: "No valid content items found" }, { status: 400 })
    }

    // Merge with existing arrays
    const mergedIds = Array.from(new Set([...existingIds, ...idsToAdd]))
    const previousDetailed = Array.isArray(bundleData.detailedContentItems) ? bundleData.detailedContentItems : []
    const mergedDetailed = [...previousDetailed, ...detailedContentItems]

    const finalContentMetadata = {
      totalItems: mergedDetailed.length,
      totalSize: mergedDetailed.reduce((s: number, it: any) => s + (it.fileSize || 0), 0),
      totalSizeFormatted: formatFileSize(mergedDetailed.reduce((s: number, it: any) => s + (it.fileSize || 0), 0)),
      totalDuration: mergedDetailed.reduce((s: number, it: any) => s + (it.duration || 0), 0),
      totalDurationFormatted: formatDuration(mergedDetailed.reduce((s: number, it: any) => s + (it.duration || 0), 0)),
      contentBreakdown: {
        videos: mergedDetailed.filter((i: any) => i.contentType === "video").length,
        audio: mergedDetailed.filter((i: any) => i.contentType === "audio").length,
        images: mergedDetailed.filter((i: any) => i.contentType === "image").length,
        documents: mergedDetailed.filter((i: any) => i.contentType === "document").length,
      },
      formats: Array.from(new Set(mergedDetailed.map((i: any) => i.format).filter(Boolean))),
      qualities: Array.from(new Set(mergedDetailed.map((i: any) => i.quality).filter(Boolean))),
      lastUpdated: new Date(),
    }

    await bundleRef.update({
      contentItems: mergedIds,
      detailedContentItems: mergedDetailed,
      contentMetadata: finalContentMetadata,
      contentTitles: mergedDetailed.map((i: any) => i.title),
      contentDescriptions: mergedDetailed.map((i: any) => i.description).filter(Boolean),
      contentTags: Array.from(new Set(mergedDetailed.flatMap((i: any) => i.tags || []))),
      contentUrls: mergedDetailed.map((i: any) => i.fileUrl),
      contentThumbnails: mergedDetailed.map((i: any) => i.thumbnailUrl).filter(Boolean),
      updatedAt: new Date(),
      contentLastUpdated: new Date(),
    })

    return NextResponse.json({
      success: true,
      added: detailedContentItems.length,
      skipped,
      maxPerBundle,
      remainingBefore: remaining,
    })
  } catch (error) {
    console.error(`❌ [Add Content] Error adding content to bundle:`, error)
    return NextResponse.json({ error: "Failed to add content to bundle" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
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
    return NextResponse.json({ error: "Failed to get bundle content" }, { status: 500 })
  }
}
