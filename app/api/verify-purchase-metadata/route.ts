import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { purchaseId, userId } = await request.json()

    console.log(`🔍 [Metadata Verification] Verifying purchase ${purchaseId} for user ${userId}`)

    // Get the purchase record
    const purchaseDoc = await db.collection("userPurchases").doc(userId).collection("purchases").doc(purchaseId).get()

    if (!purchaseDoc.exists) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    const purchaseData = purchaseDoc.data()!
    const items = purchaseData.items || []

    console.log(`📊 [Metadata Verification] Found ${items.length} items in purchase`)

    // Verify each item has complete metadata
    const verificationResults = []
    for (const item of items) {
      const verification = {
        id: item.id,
        hasTitle: !!item.displayTitle,
        hasFileUrl: !!item.fileUrl,
        hasFileSize: !!item.fileSize && !!item.displaySize,
        hasThumbnail: !!item.thumbnailUrl,
        hasResolution: !!item.displayResolution || !!item.resolution,
        hasDuration: !!item.displayDuration || !!item.duration,
        hasContentType: !!item.contentType,
        hasMimeType: !!item.mimeType,
        hasFilename: !!item.filename,

        // Check if all critical metadata is present
        isComplete: !!(
          item.displayTitle &&
          item.fileUrl &&
          item.fileSize &&
          item.contentType &&
          item.mimeType &&
          item.filename
        ),

        metadata: {
          title: item.displayTitle,
          size: item.displaySize,
          resolution: item.displayResolution,
          duration: item.displayDuration,
          contentType: item.contentType,
          fileSize: item.fileSize,
          hasValidUrl: item.fileUrl?.startsWith("http"),
        },
      }

      verificationResults.push(verification)
    }

    const allComplete = verificationResults.every((result) => result.isComplete)
    const missingMetadata = verificationResults.filter((result) => !result.isComplete)

    console.log(`✅ [Metadata Verification] Verification complete. All items valid: ${allComplete}`)

    return NextResponse.json({
      success: true,
      purchaseId,
      totalItems: items.length,
      allMetadataComplete: allComplete,
      verificationResults,
      missingMetadata: missingMetadata.length > 0 ? missingMetadata : null,
      summary: {
        itemsWithTitles: verificationResults.filter((r) => r.hasTitle).length,
        itemsWithFileSizes: verificationResults.filter((r) => r.hasFileSize).length,
        itemsWithThumbnails: verificationResults.filter((r) => r.hasThumbnail).length,
        itemsWithResolution: verificationResults.filter((r) => r.hasResolution).length,
        itemsWithDuration: verificationResults.filter((r) => r.hasDuration).length,
        completeItems: verificationResults.filter((r) => r.isComplete).length,
      },
    })
  } catch (error) {
    console.error("❌ [Metadata Verification] Error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
