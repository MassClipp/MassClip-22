import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id
    console.log(`🔍 [Bundle API] Fetching bundle: ${bundleId}`)

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    // Get bundle document from Firestore
    const bundleDoc = await adminDb.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.log(`❌ [Bundle API] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    if (!bundleData) {
      return NextResponse.json({ error: "Bundle data is empty" }, { status: 404 })
    }

    console.log(`📦 [Bundle API] Raw bundle data:`, bundleData)

    // Get creator information if available
    let creatorData = null
    if (bundleData.creatorId) {
      try {
        const creatorDoc = await adminDb.collection("users").doc(bundleData.creatorId).get()
        if (creatorDoc.exists) {
          creatorData = creatorDoc.data()
          console.log(`👤 [Bundle API] Creator data found:`, {
            name: creatorData?.displayName || creatorData?.name,
            username: creatorData?.username,
          })
        }
      } catch (error) {
        console.warn(`⚠️ [Bundle API] Could not fetch creator data:`, error)
      }
    }

    // Helper function to safely extract field values with multiple fallbacks
    const extractField = (data: any, fieldNames: string[], defaultValue: any = null) => {
      for (const fieldName of fieldNames) {
        if (data[fieldName] !== undefined && data[fieldName] !== null && data[fieldName] !== "") {
          return data[fieldName]
        }
      }
      return defaultValue
    }

    // Format file size
    const formatFileSize = (bytes: any) => {
      if (!bytes || bytes === 0) return "Unknown"

      // Handle string values
      if (typeof bytes === "string") {
        const parsed = Number.parseInt(bytes)
        if (isNaN(parsed)) return bytes // Return as-is if not a number
        bytes = parsed
      }

      if (typeof bytes !== "number") return "Unknown"

      const k = 1024
      const sizes = ["Bytes", "KB", "MB", "GB"]
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
    }

    // Format date safely
    const formatDate = (timestamp: any) => {
      try {
        if (!timestamp) return null

        // Handle Firestore Timestamp
        if (timestamp.toDate && typeof timestamp.toDate === "function") {
          return timestamp.toDate().toISOString()
        }

        // Handle regular Date
        if (timestamp instanceof Date) {
          return timestamp.toISOString()
        }

        // Handle string dates
        if (typeof timestamp === "string") {
          return new Date(timestamp).toISOString()
        }

        return null
      } catch (error) {
        console.warn("Error formatting date:", error)
        return null
      }
    }

    // Extract all possible bundle fields with comprehensive fallbacks
    const title = extractField(
      bundleData,
      ["title", "name", "bundleName", "displayName", "fileName", "originalFileName"],
      "Untitled Bundle",
    )

    const description = extractField(bundleData, ["description", "desc", "summary", "about", "details"], "")

    const creatorId = extractField(bundleData, ["creatorId", "userId", "ownerId", "authorId", "uploaderId"], "")

    const creatorName =
      creatorData?.displayName ||
      creatorData?.name ||
      extractField(bundleData, ["creatorName", "creatorDisplayName", "authorName", "uploaderName"], "Unknown Creator")

    const creatorUsername =
      creatorData?.username || extractField(bundleData, ["creatorUsername", "username", "handle"], "")

    const price = extractField(bundleData, ["price", "cost", "amount", "priceUSD"], 0)

    const fileSizeBytes = extractField(bundleData, ["fileSize", "size", "fileSizeBytes", "totalSize", "sizeInBytes"], 0)

    const thumbnailUrl = extractField(
      bundleData,
      ["thumbnailUrl", "thumbnail", "previewUrl", "customPreviewThumbnail", "imageUrl", "coverUrl", "posterUrl"],
      "",
    )

    const tags = extractField(bundleData, ["tags", "categories", "labels", "keywords"], [])

    const quality = extractField(bundleData, ["quality", "videoQuality", "resolution", "grade"], "")

    const viewCount = extractField(bundleData, ["viewCount", "views", "totalViews", "playCount"], 0)

    const downloadCount = extractField(bundleData, ["downloadCount", "downloads", "totalDownloads"], 0)

    const createdAt = formatDate(
      extractField(bundleData, ["createdAt", "uploadedAt", "dateCreated", "timestamp", "created"]),
    )

    const downloadUrl = extractField(bundleData, ["downloadUrl", "fileUrl", "url", "publicUrl", "directUrl"], "")

    const fileType = extractField(bundleData, ["fileType", "mimeType", "contentType", "type"], "")

    // Build comprehensive bundle response
    const bundleResponse = {
      id: bundleId,
      title,
      description,
      price: typeof price === "number" ? price : Number.parseFloat(price) || 0,
      creatorId,
      creatorName,
      creatorUsername,
      fileSize: formatFileSize(fileSizeBytes),
      fileSizeBytes: typeof fileSizeBytes === "number" ? fileSizeBytes : Number.parseInt(fileSizeBytes) || 0,
      thumbnailUrl: thumbnailUrl || null,
      quality: quality || null,
      views: typeof viewCount === "number" ? viewCount : Number.parseInt(viewCount) || 0,
      downloads: typeof downloadCount === "number" ? downloadCount : Number.parseInt(downloadCount) || 0,
      tags: Array.isArray(tags) ? tags : [],
      createdAt,
      downloadUrl,
      fileType,
      currency: "USD",
      isPublic: extractField(bundleData, ["isPublic", "public"], true),

      // Include raw data for debugging
      _raw: bundleData,
      _creator: creatorData,
    }

    console.log(`✅ [Bundle API] Formatted bundle response:`, {
      id: bundleResponse.id,
      title: bundleResponse.title,
      creatorName: bundleResponse.creatorName,
      price: bundleResponse.price,
      fileSize: bundleResponse.fileSize,
    })

    return NextResponse.json(bundleResponse)
  } catch (error: any) {
    console.error(`❌ [Bundle API] Error fetching bundle:`, error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
