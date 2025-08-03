import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  console.log(`🔍 [Bundle API] Fetching bundle: ${params.id}`)

  try {
    const bundleId = params.id

    if (!bundleId) {
      return NextResponse.json(
        {
          error: "Bundle ID is required",
          code: "MISSING_BUNDLE_ID",
        },
        { status: 400 },
      )
    }

    console.log(`📦 [Bundle API] Looking up bundle in database: ${bundleId}`)

    // Get bundle document from Firestore
    const bundleDoc = await adminDb.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.log(`❌ [Bundle API] Bundle not found: ${bundleId}`)
      return NextResponse.json(
        {
          error: "Bundle not found",
          code: "BUNDLE_NOT_FOUND",
        },
        { status: 404 },
      )
    }

    const bundleData = bundleDoc.data()!
    console.log(`✅ [Bundle API] Bundle found:`, {
      id: bundleId,
      title: bundleData.title,
      creatorId: bundleData.creatorId,
    })

    // Get creator information
    let creatorData = null
    if (bundleData.creatorId) {
      try {
        const creatorDoc = await adminDb.collection("users").doc(bundleData.creatorId).get()
        if (creatorDoc.exists) {
          creatorData = creatorDoc.data()
          console.log(`✅ [Bundle API] Creator found: ${creatorData?.displayName || creatorData?.name}`)
        }
      } catch (error) {
        console.warn(`⚠️ [Bundle API] Could not fetch creator data:`, error)
      }
    }

    // Count content items if available
    let contentItemsCount = 0
    if (bundleData.contentItems && Array.isArray(bundleData.contentItems)) {
      contentItemsCount = bundleData.contentItems.length
    }

    // Prepare bundle information
    const bundleInfo = {
      id: bundleId,
      title: bundleData.title || "Untitled Bundle",
      description: bundleData.description || "",
      thumbnailUrl: bundleData.thumbnailUrl || bundleData.customPreviewThumbnail || "",
      creatorId: bundleData.creatorId || "",
      creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
      creatorUsername: creatorData?.username || "",
      fileSize: bundleData.fileSize || bundleData.size || 0,
      fileType: bundleData.fileType || bundleData.mimeType || "application/octet-stream",
      tags: bundleData.tags || [],
      isPublic: bundleData.isPublic !== false,
      contentItems: contentItemsCount,
      downloadUrl: bundleData.downloadUrl || bundleData.fileUrl || "",
      createdAt: bundleData.createdAt || bundleData.uploadedAt || new Date(),
      updatedAt: bundleData.updatedAt || new Date(),
    }

    console.log(`📊 [Bundle API] Complete bundle info prepared:`, bundleInfo)

    return NextResponse.json({
      success: true,
      bundle: bundleInfo,
      message: "Bundle information retrieved successfully",
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
