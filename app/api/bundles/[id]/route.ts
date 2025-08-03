import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("🔍 [Bundle API] Fetching bundle:", params.id)

  try {
    const bundleId = params.id

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    // Get bundle document
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.log("❌ [Bundle API] Bundle not found:", bundleId)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log("📦 [Bundle API] Bundle data found:", {
      id: bundleId,
      title: bundleData.title,
      creatorId: bundleData.creatorId,
    })

    // Get creator information
    let creatorData = null
    if (bundleData.creatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
        if (creatorDoc.exists) {
          const creator = creatorDoc.data()!
          creatorData = {
            id: bundleData.creatorId,
            name: creator.displayName || creator.name || creator.email?.split("@")[0] || "Unknown Creator",
            username: creator.username || "",
            profilePicture: creator.profilePicture || creator.photoURL || "",
          }
          console.log("👤 [Bundle API] Creator data found:", creatorData.name)
        }
      } catch (error) {
        console.warn("⚠️ [Bundle API] Could not fetch creator data:", error)
      }
    }

    // Prepare response data
    const responseData = {
      id: bundleId,
      title: bundleData.title || "Untitled Bundle",
      description: bundleData.description || "",
      thumbnailUrl: bundleData.thumbnailUrl || bundleData.customPreviewThumbnail || "",
      fileUrl: bundleData.downloadUrl || bundleData.fileUrl || "",
      fileSize: bundleData.fileSize || 0,
      fileType: bundleData.fileType || bundleData.mimeType || "application/octet-stream",
      price: bundleData.price || 0,
      currency: bundleData.currency || "usd",
      creatorId: bundleData.creatorId || "",
      creatorName: creatorData?.name || "Unknown Creator",
      creatorUsername: creatorData?.username || "",
      isPublic: bundleData.isPublic !== false,
      createdAt: bundleData.createdAt || bundleData.uploadedAt || new Date(),
      tags: bundleData.tags || [],
      category: bundleData.category || "",
      downloadCount: bundleData.downloadCount || 0,
      viewCount: bundleData.viewCount || 0,
      contentItems: bundleData.contentItems || [],
      creator: creatorData,
    }

    console.log("✅ [Bundle API] Returning bundle data:", {
      id: responseData.id,
      title: responseData.title,
      creator: responseData.creatorName,
      fileSize: responseData.fileSize,
      contentItems: responseData.contentItems.length,
    })

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error("❌ [Bundle API] Error fetching bundle:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
