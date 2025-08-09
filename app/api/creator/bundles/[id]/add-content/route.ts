import { type NextRequest, NextResponse } from "next/server"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin (minimal required fields)
if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    console.error("❌ [Add Content] Missing Firebase Admin credentials.")
  } else {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    })
  }
}

const db = getFirestore()

type ContentType = "video" | "audio" | "image" | "document"

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / Math.pow(k, i)
  return `${Math.round(value * 100) / 100} ${sizes[i]}`
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

function getContentType(mimeType: string): ContentType {
  if (!mimeType) return "document"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}

// Very small, safe tier defaults for free users; pro users unlimited
async function getTierInfo(uid: string): Promise<{ maxVideosPerBundle: number | null }> {
  try {
    // Prefer explicit per-user config if present
    const proDoc = await db.collection("creatorProUsers").doc(uid).get()
    if (proDoc.exists) {
      const mvb = proDoc.get("maxVideosPerBundle")
      return { maxVideosPerBundle: typeof mvb === "number" ? mvb : null } // null => unlimited
    }

    const freeDoc = await db.collection("freeUsers").doc(uid).get()
    if (freeDoc.exists) {
      const mvb = freeDoc.get("maxVideosPerBundle")
      return { maxVideosPerBundle: typeof mvb === "number" ? mvb : 10 }
    }
  } catch (e) {
    console.warn("⚠️ [Add Content] Tier lookup failed, using defaults.", e)
  }
  // Defaults: free = 10
  return { maxVideosPerBundle: 10 }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const startedAt = Date.now()
  try {
    // Auth
    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization Bearer token" }, { status: 401 })
    }

    let decoded
    try {
      decoded = await getAuth().verifyIdToken(token)
    } catch (e) {
      console.error("❌ [Add Content] verifyIdToken failed:", e)
      return NextResponse.json({ error: "Invalid or expired auth token" }, { status: 401 })
    }
    const uid = decoded.uid

    // Inputs
    const bundleId = params.id
    if (!bundleId) return NextResponse.json({ error: "Missing bundle id" }, { status: 400 })

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const { contentIds } = body || {}
    if (!Array.isArray(contentIds) || contentIds.length === 0) {
      return NextResponse.json({ error: "contentIds must be a non-empty array" }, { status: 400 })
    }

    // Bundle
    const bundleRef = db.collection("bundles").doc(bundleId)
    const bundleSnap = await bundleRef.get()
    if (!bundleSnap.exists) return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    const bundleData = bundleSnap.data() || {}
    const existingIds: string[] = Array.isArray(bundleData.contentItems) ? bundleData.contentItems : []

    // Limits
    const { maxVideosPerBundle } = await getTierInfo(uid)
    const remaining =
      maxVideosPerBundle === null ? Number.POSITIVE_INFINITY : Math.max(0, maxVideosPerBundle - existingIds.length)
    const idsToConsider = contentIds.slice(0, remaining as number)

    // Build detailed entries; only successful ones will count toward the bundle
    const detailedToAdd: any[] = []
    const successIds: string[] = []
    const skippedInvalidIds: string[] = []

    for (const contentId of idsToConsider) {
      try {
        // Lookup upload by id, or creatorUploads by uploadId
        const uploadDoc = await db.collection("uploads").doc(contentId).get()
        let uploadData: any | null = null

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

        if (!uploadData) {
          skippedInvalidIds.push(contentId)
          continue
        }

        const fileUrl =
          uploadData.fileUrl || uploadData.downloadUrl || uploadData.publicUrl || uploadData.url || uploadData.sourceUrl
        if (!fileUrl || typeof fileUrl !== "string" || !fileUrl.startsWith("http")) {
          skippedInvalidIds.push(contentId)
          continue
        }

        const fileSize = Number(uploadData.fileSize ?? uploadData.size ?? 0) || 0
        const duration = Number(uploadData.duration ?? uploadData.videoDuration ?? 0) || 0
        const mimeType = uploadData.mimeType || uploadData.fileType || "application/octet-stream"
        const contentType = getContentType(mimeType)
        const format = (typeof mimeType === "string" && mimeType.split("/")[1]) || "unknown"
        const title =
          uploadData.title || uploadData.filename || uploadData.originalFileName || uploadData.name || "Untitled"
        const filename = uploadData.filename || uploadData.originalFileName || title || "unknown.file"

        const detailedItem = {
          id: contentId,
          uploadId: contentId,
          fileUrl,
          downloadUrl: uploadData.downloadUrl || fileUrl,
          publicUrl: uploadData.publicUrl || fileUrl,
          filename,
          fileSize,
          fileSizeFormatted: formatFileSize(fileSize),
          title,
          displayTitle: title,
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
          tags: Array.isArray(uploadData.tags) ? uploadData.tags : [],
          isPublic: uploadData.isPublic !== false,
          viewCount: Number(uploadData.viewCount ?? 0) || 0,
          downloadCount: Number(uploadData.downloadCount ?? 0) || 0,
          createdAt: uploadData.createdAt || uploadData.uploadedAt || new Date(),
          uploadedAt: uploadData.uploadedAt || uploadData.createdAt || new Date(),
          addedToBundleAt: new Date(),
        }

        detailedToAdd.push(detailedItem)
        successIds.push(contentId)

        // Ensure productBoxContent doc exists (avoid duplicates)
        const existing = await db
          .collection("productBoxContent")
          .where("productBoxId", "==", bundleId)
          .where("uploadId", "==", contentId)
          .limit(1)
          .get()

        if (existing.empty) {
          await db.collection("productBoxContent").add({
            productBoxId: bundleId,
            uploadId: contentId,
            title,
            fileUrl,
            thumbnailUrl: detailedItem.thumbnailUrl,
            mimeType,
            fileSize,
            filename,
            createdAt: new Date(),
          })
        }
      } catch (e) {
        console.error("❌ [Add Content] Failed to process contentId:", contentId, e)
        skippedInvalidIds.push(contentId)
      }
    }

    if (detailedToAdd.length === 0) {
      return NextResponse.json({ error: "No valid content items found" }, { status: 400 })
    }

    // Merge ONLY successful ids so invalid items do not consume the limit
    const mergedIds = Array.from(new Set([...existingIds, ...successIds]))
    const prevDetailed = Array.isArray(bundleData.detailedContentItems) ? bundleData.detailedContentItems : []
    const mergedDetailed = [...prevDetailed, ...detailedToAdd]

    const totalSize = mergedDetailed.reduce((s: number, it: any) => s + (Number(it.fileSize) || 0), 0)
    const totalDuration = mergedDetailed.reduce((s: number, it: any) => s + (Number(it.duration) || 0), 0)

    const finalContentMetadata = {
      totalItems: mergedDetailed.length,
      totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
      totalDuration,
      totalDurationFormatted: formatDuration(totalDuration),
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
      contentTags: Array.from(new Set(mergedDetailed.flatMap((i: any) => (Array.isArray(i.tags) ? i.tags : [])))),
      contentUrls: mergedDetailed.map((i: any) => i.fileUrl),
      contentThumbnails: mergedDetailed.map((i: any) => i.thumbnailUrl).filter(Boolean),
      updatedAt: new Date(),
      contentLastUpdated: new Date(),
    })

    return NextResponse.json({
      success: true,
      added: detailedToAdd.length,
      skippedForLimit: Math.max(0, idsToConsider.length - detailedToAdd.length - skippedInvalidIds.length),
      skippedInvalid: skippedInvalidIds.length,
      maxPerBundle: maxVideosPerBundle,
      durationMs: Date.now() - startedAt,
    })
  } catch (error: any) {
    console.error("❌ [Add Content] Unhandled error:", error)
    const message = typeof error?.message === "string" ? error.message : "Failed to add content to bundle"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id
    const snap = await db.collection("bundles").doc(bundleId).get()
    if (!snap.exists) return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    const data = snap.data()!
    return NextResponse.json({
      success: true,
      bundle: {
        id: bundleId,
        title: data.title,
        contentItems: data.contentItems || [],
        detailedContentItems: data.detailedContentItems || [],
        contentMetadata: data.contentMetadata || {},
        contentTitles: data.contentTitles || [],
        contentUrls: data.contentUrls || [],
        contentThumbnails: data.contentThumbnails || [],
      },
    })
  } catch (e) {
    console.error("❌ [Get Bundle Content] Error:", e)
    return NextResponse.json({ error: "Failed to get bundle content" }, { status: 500 })
  }
}
