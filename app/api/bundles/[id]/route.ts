import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  console.log(`🔍 [Bundle API] Fetching bundle info for ID: ${params.id}`)

  try {
    const bundleId = params.id

    if (!bundleId) {
      console.error("❌ [Bundle API] No bundle ID provided")
      return NextResponse.json(
        {
          error: "Bundle ID is required",
          code: "MISSING_BUNDLE_ID",
        },
        { status: 400 },
      )
    }

    // Fetch bundle from Firestore
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.error(`❌ [Bundle API] Bundle ${bundleId} not found`)
      return NextResponse.json(
        {
          error: "Bundle not found",
          code: "BUNDLE_NOT_FOUND",
        },
        { status: 404 },
      )
    }

    const bundleData = bundleDoc.data()!
    console.log(`📦 [Bundle API] Bundle data retrieved:`, {
      id: bundleId,
      title: bundleData.title,
      creatorId: bundleData.creatorId,
    })

    // Get creator information
    let creatorInfo = {
      id: bundleData.creatorId || "",
      name: "Unknown Creator",
      username: "",
    }

    if (bundleData.creatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()!
          creatorInfo = {
            id: bundleData.creatorId,
            name: creatorData.displayName || creatorData.name || "Unknown Creator",
            username: creatorData.username || "",
          }
          console.log(`👤 [Bundle API] Creator info retrieved:`, creatorInfo)
        }
      } catch (error) {
        console.warn(`⚠️ [Bundle API] Could not fetch creator info:`, error)
      }
    }

    // Count content items if available
    let contentItemsCount = 0
    if (bundleData.contentItems && Array.isArray(bundleData.contentItems)) {
      contentItemsCount = bundleData.contentItems.length
    }

    // Prepare bundle response
    const bundleInfo = {
      id: bundleId,
      title: bundleData.title || "Untitled Bundle",
      description: bundleData.description || "",
      thumbnailUrl: bundleData.thumbnailUrl || bundleData.customPreviewThumbnail || "",
      creatorId: creatorInfo.id,
      creatorName: creatorInfo.name,
      creatorUsername: creatorInfo.username,
      fileSize: bundleData.fileSize || bundleData.size || 0,
      fileType: bundleData.fileType || bundleData.mimeType || "application/octet-stream",
      tags: bundleData.tags || [],
      isPublic: bundleData.isPublic !== false,
      contentItems: contentItemsCount,
      downloadUrl: bundleData.downloadUrl || bundleData.fileUrl || "",
      createdAt: bundleData.createdAt || new Date(),
      updatedAt: bundleData.updatedAt || new Date(),
    }

    console.log(`✅ [Bundle API] Bundle info prepared for response:`, {
      id: bundleInfo.id,
      title: bundleInfo.title,
      creator: bundleInfo.creatorName,
      contentItems: bundleInfo.contentItems,
    })

    return NextResponse.json({
      success: true,
      bundle: bundleInfo,
    })
  } catch (error: any) {
    console.error(`❌ [Bundle API] Error fetching bundle ${params.id}:`, error)
    console.error(`❌ [Bundle API] Error stack:`, error.stack)

    return NextResponse.json(
      {
        error: "Failed to fetch bundle information",
        details: error.message || "Unknown error occurred",
        code: error.code || "INTERNAL_ERROR",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
