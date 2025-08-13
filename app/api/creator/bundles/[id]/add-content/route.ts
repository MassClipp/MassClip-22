import { type NextRequest, NextResponse } from "next/server"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, Timestamp } from "firebase-admin/firestore"

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

async function getTierInfoSafe(uid: string): Promise<{ maxVideosPerBundle: number | null; maxBundles: number | null }> {
  try {
    console.log("🔍 [Bundle Limit] Checking user tier for:", uid.substring(0, 8) + "...")

    // Check if user has active pro membership first
    const membershipDoc = await db.collection("memberships").doc(uid).get()
    if (membershipDoc.exists) {
      const membershipData = membershipDoc.data()
      if (membershipData?.active && membershipData?.isActive) {
        console.log("🚀 [Bundle Limit] Found ACTIVE Creator Pro membership - UNLIMITED EVERYTHING")
        return {
          maxVideosPerBundle: null, // Unlimited videos per bundle
          maxBundles: null, // Unlimited bundles
        }
      } else {
        console.log("ℹ️ [Bundle Limit] Found inactive membership, checking free user...")
      }
    }

    // Check if user has active free user document
    const freeUserDoc = await db.collection("freeUsers").doc(uid).get()
    if (freeUserDoc.exists) {
      const freeUserData = freeUserDoc.data()
      if (freeUserData?.active) {
        console.log("📝 [Bundle Limit] Found ACTIVE free user - applying limits")
        return {
          maxVideosPerBundle: freeUserData.maxVideosPerBundle || 10,
          maxBundles: freeUserData.bundlesLimit || 2,
        }
      } else {
        console.log("ℹ️ [Bundle Limit] Found inactive free user...")
      }
    }

    // No active documents found - default to free limits but log warning
    console.warn("⚠️ [Bundle Limit] No active user documents found, defaulting to free limits")
    return { maxVideosPerBundle: 10, maxBundles: 2 }
  } catch (e) {
    console.error("❌ [Bundle Limit] Error checking user tier:", e)
    // Default to free tier limits on error
    return { maxVideosPerBundle: 10, maxBundles: 2 }
  }
}

async function buildDetailedItemsForIds(idsToAdd: string[]) {
  const results: any[] = []
  const errors: string[] = [] // Track specific validation errors

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
        const error = `Content ${contentId} not found in uploads or creatorUploads collections`
        console.warn(`⚠️ [Add Content] ${error}`)
        errors.push(error) // Track specific error
        continue
      }

      const fileUrl =
        uploadData.fileUrl || uploadData.downloadUrl || uploadData.publicUrl || uploadData.url || uploadData.sourceUrl
      if (!fileUrl || typeof fileUrl !== "string") {
        const error = `Content ${contentId} has invalid or missing fileUrl`
        console.warn(`⚠️ [Add Content] ${error}`)
        errors.push(error) // Track specific error
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
      const error = `Failed processing content ${contentId}: ${e instanceof Error ? e.message : "Unknown error"}`
      console.error("❌ [Add Content] " + error, e)
      errors.push(error) // Track specific error
    }
  }

  return { results, errors } // Return both results and errors
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

    // Enforce tier limits - FIXED: Now properly checks active membership
    const tier = await getTierInfoSafe(uid)

    const existingDetailed = Array.isArray(bundleData.detailedContentItems) ? bundleData.detailedContentItems : []
    const currentCount = existingDetailed.length

    // Simplified logic: null means unlimited, period
    let remaining: number
    if (tier.maxVideosPerBundle === null) {
      remaining = Number.POSITIVE_INFINITY // Creator Pro = unlimited
      console.log("🚀 [Bundle Limit] Creator Pro user - NO LIMITS APPLIED")
    } else {
      remaining = Math.max(0, tier.maxVideosPerBundle - currentCount)
      console.log("📊 [Bundle Limit] Free user limits applied:", {
        limit: tier.maxVideosPerBundle,
        current: currentCount,
        remaining: remaining,
      })
    }

    const existingIds = new Set(
      existingDetailed
        .map((item: any) => {
          // Normalize ID field - prefer uploadId, fallback to id
          const itemId = item.uploadId || item.id
          return typeof itemId === "string" && itemId.length > 0 ? itemId : null
        })
        .filter(Boolean),
    )

    console.log("🔍 [Add Content] Existing content IDs:", Array.from(existingIds))

    // Remove already-in-bundle from selection BEFORE slicing to limit
    const inputIds: string[] = (contentIds as string[]).filter((id) => typeof id === "string" && id.length > 0)
    const notAlreadyInBundle = inputIds.filter((id) => !existingIds.has(id))

    console.log("🔍 [Add Content] Content filtering:", {
      inputIds: inputIds.length,
      alreadyInBundle: inputIds.length - notAlreadyInBundle.length,
      notAlreadyInBundle: notAlreadyInBundle.length,
    })

    const idsToAdd =
      remaining === Number.POSITIVE_INFINITY ? notAlreadyInBundle : notAlreadyInBundle.slice(0, remaining)

    const duplicatesSelected = notAlreadyInBundle.length === 0 && inputIds.length > 0
    const skipped = inputIds.length - idsToAdd.length

    console.log("🔍 [Add Content] Final selection:", {
      idsToAdd: idsToAdd.length,
      skipped,
      duplicatesSelected,
    })

    // Build detailed items and write productBoxContent only if missing
    const { results: detailedToAdd, errors: validationErrors } = await buildDetailedItemsForIds(idsToAdd) // Get both results and errors

    if (detailedToAdd.length === 0 && !duplicatesSelected) {
      const errorMessage =
        validationErrors.length > 0
          ? `Content validation failed: ${validationErrors.join("; ")}`
          : "No valid content items found"

      console.error("❌ [Add Content] Content validation failed:", {
        inputIds: idsToAdd,
        validationErrors,
        duplicatesSelected,
      })

      return NextResponse.json(
        {
          error: errorMessage,
          details: validationErrors,
          debug: {
            inputIds: idsToAdd,
            validationErrors,
            duplicatesSelected,
          },
        },
        { status: 400 },
      )
    }

    // First, normalize existing detailed items to have consistent uploadId field
    const normalizedExisting = existingDetailed.map((item: any) => ({
      ...item,
      uploadId: item.uploadId || item.id, // Ensure uploadId is set
      id: item.id || item.uploadId, // Ensure id is set
    }))

    // Ensure new items have consistent ID fields
    const normalizedNew = detailedToAdd.map((item: any) => ({
      ...item,
      uploadId: item.uploadId || item.id,
      id: item.id || item.uploadId,
    }))

    // Merge arrays - existing items first, then new items
    const combinedDetailed = [...normalizedExisting, ...normalizedNew]

    // Deduplicate by uploadId (prefer existing items over new ones in case of conflict)
    const mergedDetailed = Array.from(new Map(combinedDetailed.map((item: any) => [item.uploadId, item])).values())

    // Create merged ID array from the final detailed items
    const mergedIds = mergedDetailed.map((item: any) => item.uploadId).filter(Boolean)

    console.log("🔍 [Add Content] Merge results:", {
      existingItems: normalizedExisting.length,
      newItems: normalizedNew.length,
      combinedItems: combinedDetailed.length,
      finalMergedItems: mergedDetailed.length,
      finalMergedIds: mergedIds.length,
    })

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
      maxPerBundle: tier.maxVideosPerBundle,
      remainingBefore: remaining,
      currentCountBefore: currentCount,
      finalCount: mergedDetailed.length,
      durationMs: Date.now() - startedAt,
      debug: {
        uid,
        membershipFound: tier.maxVideosPerBundle === null, // If null, membership was found
        isUnlimited: tier.maxVideosPerBundle === null,
        tierInfo: tier,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined, // Include validation errors in debug
      },
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
