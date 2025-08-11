import { type NextRequest, NextResponse } from "next/server"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import { UserTrackingService } from "@/lib/user-tracking-service"

// Initialize Firebase Admin with only the required fields to avoid missing env crashes
if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    // We still initialize to surface a clear error later if missing
    console.error(
      "❌ [Add Content] Missing Firebase Admin credentials. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.",
    )
  } else {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
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

// Safe tier lookup: try service first, then fallback to raw Firestore docs.
async function getTierInfoSafe(uid: string): Promise<{ maxVideosPerBundle: number | null; maxBundles: number | null }> {
  // 1) Try existing service (may throw if it uses client SDK)
  try {
    const tier = await UserTrackingService.getUserTierInfo(uid)
    // Expect shape to contain maxVideosPerBundle and maxBundles (null for unlimited)
    if (tier && ("maxVideosPerBundle" in tier || "maxBundles" in tier)) {
      return {
        maxVideosPerBundle: tier.maxVideosPerBundle ?? 10,
        maxBundles: tier.maxBundles ?? 2,
      }
    }
  } catch (e) {
    console.warn("⚠️ [Add Content] UserTrackingService.getUserTierInfo failed. Falling back to Firestore lookup.", e)
  }

  // 2) Fallback: look for a pro record, otherwise a free record
  try {
    const proDoc = await db.collection("creatorProUsers").doc(uid).get()
    if (proDoc.exists) {
      const active = proDoc.get("active")
      // Treat any pro record as unlimited unless explicitly capped
      const maxVideosPerBundle = proDoc.get("maxVideosPerBundle")
      const maxBundles = proDoc.get("maxBundles")
      return {
        maxVideosPerBundle: typeof maxVideosPerBundle === "number" ? maxVideosPerBundle : null,
        maxBundles: typeof maxBundles === "number" ? maxBundles : null,
      }
    }

    const freeDoc = await db.collection("freeUsers").doc(uid).get()
    if (freeDoc.exists) {
      const mvb = freeDoc.get("maxVideosPerBundle")
      const mb = freeDoc.get("bundlesLimit") ?? freeDoc.get("maxBundles")
      return {
        maxVideosPerBundle: typeof mvb === "number" ? mvb : 10,
        maxBundles: typeof mb === "number" ? mb : 2,
      }
    }
  } catch (e) {
    console.warn("⚠️ [Add Content] Firestore tier lookup failed.", e)
  }

  // 3) Final defaults
  return { maxVideosPerBundle: 10, maxBundles: 2 }
}

async function buildDetailedItemsForIds(idsToAdd: string[]) {
  const results: any[] = []

  for (const contentId of idsToAdd) {
    try {
      // Look up by uploads/<id>
      const uploadDoc = await db.collection("uploads").doc(contentId).get()
      let uploadData: any | null = null

      if (uploadDoc.exists) {
        uploadData = uploadDoc.data()
      } else {
        // Fallback to creatorUploads by uploadId
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
        console.warn(`⚠️ [Add Content] Skipping content ${contentId}: not found in uploads or creatorUploads.`)
        continue
      }

      const fileUrl =
        uploadData.fileUrl || uploadData.downloadUrl || uploadData.publicUrl || uploadData.url || uploadData.sourceUrl
      if (!fileUrl || typeof fileUrl !== "string") {
        console.warn(`⚠️ [Add Content] Skipping content ${contentId}: invalid fileUrl.`)
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

      results.push(detailedItem)

      // Backward-compatibility entry in productBoxContent so existing listeners/UI update immediately
      await db.collection("productBoxContent").add({
        productBoxId: "", // set by caller when known
        uploadId: contentId,
        title,
        fileUrl,
        thumbnailUrl: detailedItem.thumbnailUrl,
        mimeType,
        fileSize,
        filename,
        createdAt: new Date(),
      })
    } catch (e) {
      console.error("❌ [Add Content] Failed processing content:", contentId, e)
    }
  }

  return results
}

function convertDatesToTimestamps(obj: any): any {
  if (obj instanceof Date) {
    return Timestamp.fromDate(obj)
  }
  if (Array.isArray(obj)) {
    return obj.map(convertDatesToTimestamps)
  }
  if (obj && typeof obj === "object") {
    const converted: any = {}
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertDatesToTimestamps(value)
    }
    return converted
  }
  return obj
}

// Helper function to remove undefined values from objects
function removeUndefinedValues(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues).filter((item) => item !== undefined)
  }
  if (obj && typeof obj === "object" && !(obj instanceof Date)) {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value)
      }
    }
    return cleaned
  }
  return obj
}

// Helper function to ensure string values are never undefined
function ensureString(value: any, fallback = ""): string {
  if (typeof value === "string" && value.length > 0) {
    return value
  }
  return fallback
}

// Helper function to ensure array values are never undefined
function ensureStringArray(arr: any[], mapper: (item: any) => string, fallback = ""): string[] {
  if (!Array.isArray(arr)) return []
  return arr
    .map((item) => {
      const result = mapper(item)
      return ensureString(result, fallback)
    })
    .filter((item) => item.length > 0)
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

    const bundleId = params.id
    if (!bundleId) {
      return NextResponse.json({ error: "Missing bundle id" }, { status: 400 })
    }

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

    // Get bundle doc
    const bundleRef = db.collection("bundles").doc(bundleId)
    const bundleSnap = await bundleRef.get()
    if (!bundleSnap.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }
    const bundleData = bundleSnap.data() || {}

    // Enforce tier limits
    const tier = await getTierInfoSafe(uid)

    const existingDetailed = Array.isArray(bundleData.detailedContentItems) ? bundleData.detailedContentItems : []
    const currentCount = existingDetailed.length
    const maxPerBundle = tier.maxVideosPerBundle === null ? null : 10

    const remaining = maxPerBundle === null ? Number.POSITIVE_INFINITY : Math.max(0, maxPerBundle - currentCount)

    console.log("🔍 [Add Content] Bundle limit check:", {
      currentCount,
      maxPerBundle,
      remaining,
      tier: tier.maxVideosPerBundle,
      detailedItemsCount: existingDetailed.length,
      contentItemsCount: Array.isArray(bundleData.contentItems) ? bundleData.contentItems.length : 0,
    })

    const existingIds = new Set(existingDetailed.map((item: any) => item.uploadId || item.id).filter(Boolean))

    // Remove already-in-bundle from selection BEFORE slicing to limit
    const inputIds: string[] = (contentIds as string[]).filter((id) => typeof id === "string" && id.length > 0)
    const notAlreadyInBundle = inputIds.filter((id) => !existingIds.has(id))

    const idsToAdd =
      remaining === Number.POSITIVE_INFINITY ? notAlreadyInBundle : notAlreadyInBundle.slice(0, remaining)

    const duplicatesSelected = notAlreadyInBundle.length === 0 && inputIds.length > 0
    const skipped = inputIds.length - idsToAdd.length

    // Build detailed items and write productBoxContent only if missing
    const detailedToAdd: any[] = await buildDetailedItemsForIds(idsToAdd)

    if (detailedToAdd.length === 0 && !duplicatesSelected) {
      return NextResponse.json({ error: "No valid content items found" }, { status: 400 })
    }

    // Merge with existing arrays (dedupe IDs and detailed items)
    const mergedIds = Array.from(new Set<string>([...existingIds, ...idsToAdd]))

    const previousDetailed = Array.isArray(bundleData.detailedContentItems) ? bundleData.detailedContentItems : []
    const combinedDetailed = [...previousDetailed, ...detailedToAdd]
    const mergedDetailed = Array.from(new Map(combinedDetailed.map((i: any) => [i.uploadId ?? i.id, i]))).values()

    const totalSize = mergedDetailed.reduce((s: number, it: any) => s + (Number(it.fileSize) || 0), 0)
    const totalDuration = mergedDetailed.reduce((s: number, it: any) => s + (Number(it.duration) || 0), 0)
    const totalItems = Array.isArray(mergedDetailed) ? mergedDetailed.length : 0

    const finalContentMetadata = {
      totalItems: totalItems || 0,
      totalSize: totalSize || 0,
      totalSizeFormatted: formatFileSize(totalSize || 0),
      totalDuration: totalDuration || 0,
      totalDurationFormatted: formatDuration(totalDuration || 0),
      contentBreakdown: {
        videos: mergedDetailed.filter((i: any) => i.contentType === "video").length || 0,
        audio: mergedDetailed.filter((i: any) => i.contentType === "audio").length || 0,
        images: mergedDetailed.filter((i: any) => i.contentType === "image").length || 0,
        documents: mergedDetailed.filter((i: any) => i.contentType === "document").length || 0,
      },
      formats: Array.from(new Set(mergedDetailed.map((i: any) => i.format).filter(Boolean))),
      qualities: Array.from(new Set(mergedDetailed.map((i: any) => i.quality).filter(Boolean))),
      lastUpdated: new Date(),
    }

    const serializedDetailed = convertDatesToTimestamps(mergedDetailed)
    const serializedMetadata = convertDatesToTimestamps(finalContentMetadata)

    const updateData = {
      contentItems: mergedIds,
      detailedContentItems: serializedDetailed,
      contentMetadata: serializedMetadata,
      contentTitles: ensureStringArray(mergedDetailed, (i: any) => i.title, "Untitled"),
      contentDescriptions: ensureStringArray(mergedDetailed, (i: any) => i.description, ""),
      contentTags: Array.from(
        new Set(
          mergedDetailed
            .flatMap((i: any) => (Array.isArray(i.tags) ? i.tags : []))
            .filter((tag: any) => typeof tag === "string" && tag.length > 0),
        ),
      ),
      contentUrls: ensureStringArray(mergedDetailed, (i: any) => i.fileUrl, ""),
      contentThumbnails: ensureStringArray(mergedDetailed, (i: any) => i.thumbnailUrl, ""),
      updatedAt: Timestamp.now(),
      contentLastUpdated: Timestamp.now(),
    }

    const cleanedUpdateData = removeUndefinedValues(updateData)

    console.log("📝 [Add Content] Updating bundle with data:", {
      contentItemsCount: cleanedUpdateData.contentItems?.length,
      detailedItemsCount: cleanedUpdateData.detailedContentItems?.length,
      totalItems: cleanedUpdateData.contentMetadata?.totalItems,
      contentTitlesCount: cleanedUpdateData.contentTitles?.length,
    })

    await bundleRef.update(cleanedUpdateData)

    return NextResponse.json({
      success: true,
      added: detailedToAdd.length,
      skipped,
      reason: duplicatesSelected && detailedToAdd.length === 0 ? "already-in-bundle" : "ok",
      maxPerBundle,
      remainingBefore: remaining,
      currentCountBefore: currentCount,
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
    if (!snap.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }
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
