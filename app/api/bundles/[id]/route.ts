import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id
    console.log(`🔍 [Bundle API] Fetching bundle: ${bundleId}`)

    // Get bundle from Firestore
    const bundleDoc = await adminDb.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.log(`❌ [Bundle API] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    console.log(`📦 [Bundle API] Raw bundle data:`, bundleData)

    if (!bundleData) {
      return NextResponse.json({ error: "Bundle data is empty" }, { status: 404 })
    }

    // Enhanced field extraction with multiple fallbacks
    const extractField = (data: any, fieldNames: string[], defaultValue: any = null) => {
      for (const fieldName of fieldNames) {
        if (data[fieldName] !== undefined && data[fieldName] !== null) {
          return data[fieldName]
        }
      }
      return defaultValue
    }

    // Extract title with multiple possible field names
    const title = extractField(bundleData, ["title", "name", "bundleName", "displayName"], "Untitled Bundle")

    // Extract description
    const description = extractField(bundleData, ["description", "desc", "summary", "about"], "")

    // Extract creator information
    const creatorId = extractField(bundleData, ["creatorId", "userId", "ownerId", "creator"])

    const creatorUsername = extractField(bundleData, ["creatorUsername", "username", "creatorName", "creator"])

    // Extract pricing
    const price = extractField(bundleData, ["price", "cost", "amount"], 0)

    // Extract file size with multiple possible formats
    const fileSize = extractField(bundleData, ["fileSize", "size", "fileSizeBytes", "totalSize", "bundleSize"])

    // Format file size if it's a number
    let formattedFileSize = "Unknown"
    if (typeof fileSize === "number" && fileSize > 0) {
      if (fileSize < 1024) {
        formattedFileSize = `${fileSize} B`
      } else if (fileSize < 1024 * 1024) {
        formattedFileSize = `${(fileSize / 1024).toFixed(1)} KB`
      } else if (fileSize < 1024 * 1024 * 1024) {
        formattedFileSize = `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
      } else {
        formattedFileSize = `${(fileSize / (1024 * 1024 * 1024)).toFixed(1)} GB`
      }
    } else if (typeof fileSize === "string" && fileSize) {
      formattedFileSize = fileSize
    }

    // Extract thumbnail URL
    const thumbnailUrl = extractField(bundleData, [
      "thumbnailUrl",
      "thumbnail",
      "previewUrl",
      "customPreviewThumbnail",
      "image",
    ])

    // Extract content items count
    const contentItems = bundleData.contentItems || bundleData.items || bundleData.files || []
    const contentCount = Array.isArray(contentItems) ? contentItems.length : 0

    // Extract tags
    const tags = extractField(bundleData, ["tags", "categories", "labels"], [])

    // Extract quality
    const quality = extractField(bundleData, ["quality", "videoQuality", "resolution"])

    // Extract view count
    const viewCount = extractField(bundleData, ["viewCount", "views", "totalViews"], 0)

    // Extract upload date
    const uploadedAt = extractField(bundleData, ["uploadedAt", "createdAt", "dateCreated", "timestamp"])

    // Format the response
    const bundle = {
      id: bundleId,
      title,
      description,
      creatorId,
      creatorUsername,
      price,
      fileSize: formattedFileSize,
      thumbnailUrl,
      contentCount,
      tags: Array.isArray(tags) ? tags : [],
      quality,
      viewCount,
      uploadedAt: uploadedAt ? (uploadedAt.toDate ? uploadedAt.toDate().toISOString() : uploadedAt) : null,
      // Include raw data for debugging
      _debug: process.env.NODE_ENV === "development" ? bundleData : undefined,
    }

    console.log(`✅ [Bundle API] Formatted bundle:`, bundle)

    return NextResponse.json({ bundle })
  } catch (error) {
    console.error(`❌ [Bundle API] Error fetching bundle:`, error)
    return NextResponse.json({ error: "Failed to fetch bundle" }, { status: 500 })
  }
}
