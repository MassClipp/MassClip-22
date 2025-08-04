import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id
    console.log(`🔍 [Bundle Content API] Fetching content for bundle: ${bundleId}`)

    // Get bundle data
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!

    // Get creator info
    let creatorData = null
    if (bundleData.creatorId) {
      const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
      if (creatorDoc.exists) {
        creatorData = creatorDoc.data()
      }
    }

    // For bundles, the content is typically the bundle file itself
    const contents = []
    if (bundleData.downloadUrl || bundleData.fileUrl) {
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
      creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
      createdAt: bundleData.createdAt || new Date().toISOString(),
      contents,
      totalSize: bundleData.fileSize || 0,
      contentCount: contents.length,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Bundle Content API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch bundle content" }, { status: 500 })
  }
}

function getContentType(mimeType: string): "video" | "audio" | "image" | "document" {
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
