import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id
    console.log(`🔍 [Bundle API] Fetching bundle: ${bundleId}`)

    if (!bundleId) {
      console.error("❌ [Bundle API] Bundle ID is required")
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    // Try to fetch from bundles collection
    const bundleRef = adminDb.collection("bundles").doc(bundleId)
    const bundleDoc = await bundleRef.get()

    if (!bundleDoc.exists) {
      console.error(`❌ [Bundle API] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    console.log("📦 [Bundle API] Raw bundle data:", bundleData)

    if (!bundleData) {
      console.error(`❌ [Bundle API] Bundle data is empty: ${bundleId}`)
      return NextResponse.json({ error: "Bundle data not found" }, { status: 404 })
    }

    // Extract bundle information with multiple fallbacks
    const extractField = (data: any, fields: string[]) => {
      for (const field of fields) {
        if (data[field] !== undefined && data[field] !== null && data[field] !== "") {
          return data[field]
        }
      }
      return null
    }

    // Format file size
    const formatFileSize = (bytes: any) => {
      if (!bytes || bytes === "NaN" || isNaN(Number(bytes))) return "Unknown size"
      const size = Number(bytes)
      if (size < 1024) return `${size} B`
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
      if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
      return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
    }

    // Extract all possible fields
    const title = extractField(bundleData, ["title", "name", "bundleName", "displayName", "label"]) || "Untitled Bundle"

    const description =
      extractField(bundleData, ["description", "desc", "summary", "details", "info"]) || "No description available"

    const price = extractField(bundleData, ["price", "cost", "amount", "value"]) || 0

    const creatorId = extractField(bundleData, ["creatorId", "creator", "userId", "owner", "uploadedBy"])

    const creatorName =
      extractField(bundleData, ["creatorName", "creatorUsername", "username", "creator", "uploaderName"]) || "Unknown"

    const fileSize = extractField(bundleData, ["fileSize", "size", "totalSize", "bundleSize"])

    const thumbnailUrl = extractField(bundleData, ["thumbnailUrl", "thumbnail", "image", "previewImage", "coverImage"])

    const quality = extractField(bundleData, ["quality", "resolution", "videoQuality"])

    const views = extractField(bundleData, ["views", "viewCount", "totalViews"]) || 0

    const downloads = extractField(bundleData, ["downloads", "downloadCount", "totalDownloads"]) || 0

    const tags = extractField(bundleData, ["tags", "categories", "keywords"]) || []

    const createdAt = bundleData.createdAt || bundleData.uploadedAt || bundleData.timestamp

    // Build the response
    const response = {
      id: bundleId,
      title,
      description,
      price: Number(price),
      creatorId,
      creatorName,
      fileSize: formatFileSize(fileSize),
      fileSizeBytes: fileSize ? Number(fileSize) : null,
      thumbnailUrl,
      quality,
      views: Number(views),
      downloads: Number(downloads),
      tags: Array.isArray(tags) ? tags : [],
      createdAt: createdAt ? (createdAt.toDate ? createdAt.toDate().toISOString() : createdAt) : null,
      // Include all original data for debugging
      _raw: bundleData,
    }

    console.log("✅ [Bundle API] Processed bundle data:", response)
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ [Bundle API] Error fetching bundle:", error)
    return NextResponse.json(
      { error: "Failed to fetch bundle", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
