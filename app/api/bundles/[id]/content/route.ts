import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id
    console.log(`🔍 [Bundle Content API] Fetching content for bundle: ${bundleId}`)

    // Get bundle data
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      console.log(`❌ [Bundle Content API] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log(`✅ [Bundle Content API] Found bundle:`, bundleData)

    // Get creator info
    let creatorData = null
    if (bundleData.creatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
        if (creatorDoc.exists) {
          creatorData = creatorDoc.data()
        }
      } catch (error) {
        console.warn(`⚠️ [Bundle Content API] Could not fetch creator info:`, error)
      }
    }

    // Process bundle contents
    const contents = []

    // If bundle has contents array, process each item
    if (bundleData.contents && Array.isArray(bundleData.contents)) {
      for (const content of bundleData.contents) {
        contents.push({
          id: content.id || `content-${contents.length}`,
          title: content.displayTitle || content.title || "Untitled Content",
          fileUrl: content.fileUrl || content.downloadUrl || "",
          mimeType: content.contentType || content.mimeType || "application/octet-stream",
          fileSize: content.fileSize || 0,
          contentType: getContentType(content.contentType || content.mimeType || ""),
          displayTitle: content.displayTitle || content.title || "Untitled Content",
          displaySize: formatFileSize(content.fileSize || 0),
          displayDuration: content.duration ? formatDuration(content.duration) : undefined,
          thumbnailUrl: content.thumbnailUrl || null,
        })
      }
    } else if (bundleData.downloadUrl || bundleData.fileUrl) {
      // Fallback: treat the bundle itself as content
      contents.push({
        id: bundleId,
        title: bundleData.title || "Bundle Content",
        fileUrl: bundleData.downloadUrl || bundleData.fileUrl,
        mimeType: bundleData.fileType || bundleData.mimeType || "application/octet-stream",
        fileSize: bundleData.fileSize || 0,
        contentType: getContentType(bundleData.fileType || bundleData.mimeType || ""),
        displayTitle: bundleData.title || "Bundle Content",
        displaySize: formatFileSize(bundleData.fileSize || 0),
        displayDuration: bundleData.duration ? formatDuration(bundleData.duration) : undefined,
        thumbnailUrl: bundleData.thumbnailUrl || null,
      })
    }

    const response = {
      id: bundleId,
      title: bundleData.title || "Untitled Bundle",
      description: bundleData.description || "",
      creatorName: creatorData?.displayName || creatorData?.name || creatorData?.username || "Unknown Creator",
      createdAt: bundleData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      contents,
      totalSize: bundleData.fileSize || 0,
      contentCount: contents.length,
    }

    console.log(`✅ [Bundle Content API] Returning response:`, response)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Bundle Content API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch bundle content", details: error.message }, { status: 500 })
  }
}

function getContentType(mimeType: string): "video" | "audio" | "image" | "document" {
  if (!mimeType) return "document"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}
