import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("🔍 [Bundle API] Fetching bundle:", params.id)

  try {
    const bundleDoc = await db.collection("bundles").doc(params.id).get()

    if (!bundleDoc.exists) {
      console.log("❌ [Bundle API] Bundle not found:", params.id)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log("✅ [Bundle API] Bundle found:", bundleData.title)

    // Get creator info if available
    let creatorInfo = null
    if (bundleData.creatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()!
          creatorInfo = {
            id: bundleData.creatorId,
            name: creatorData.displayName || creatorData.name || "Unknown Creator",
            username: creatorData.username || "",
            profilePicture: creatorData.profilePicture || "",
          }
        }
      } catch (error) {
        console.warn("⚠️ [Bundle API] Could not fetch creator info:", error)
      }
    }

    const response = {
      id: params.id,
      title: bundleData.title || "Untitled Bundle",
      description: bundleData.description || "",
      thumbnailUrl: bundleData.thumbnailUrl || bundleData.customPreviewThumbnail || "",
      fileUrl: bundleData.downloadUrl || bundleData.fileUrl || "",
      fileSize: bundleData.fileSize || 0,
      fileType: bundleData.fileType || bundleData.mimeType || "application/octet-stream",
      price: bundleData.price || 0,
      currency: bundleData.currency || "usd",
      creatorId: bundleData.creatorId || "",
      creatorName: creatorInfo?.name || bundleData.creatorName || "Unknown Creator",
      creatorUsername: creatorInfo?.username || "",
      isPublic: bundleData.isPublic !== false,
      createdAt: bundleData.createdAt || bundleData.uploadedAt || new Date(),
      updatedAt: bundleData.updatedAt || new Date(),
      tags: bundleData.tags || [],
      category: bundleData.category || "",
      downloadCount: bundleData.downloadCount || 0,
      viewCount: bundleData.viewCount || 0,
      contentItems: bundleData.contentItems || [],
      metadata: {
        duration: bundleData.duration,
        resolution: bundleData.resolution,
        format: bundleData.format,
        codec: bundleData.codec,
      },
      creator: creatorInfo,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Bundle API] Error fetching bundle:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle",
        details: error.message,
        code: "FETCH_ERROR",
      },
      { status: 500 },
    )
  }
}
