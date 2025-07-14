import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, buyerUid, userEmail, sessionId } = await request.json()

    console.log("🎯 [Direct Bundle Purchase] Creating purchase directly:", {
      productBoxId,
      buyerUid,
      userEmail,
      sessionId: sessionId || `direct-${Date.now()}`,
    })

    const finalSessionId = sessionId || `direct-${Date.now()}`

    // Get bundle/product box data
    let bundleData = null
    let productBoxData = null

    // Try bundles collection first
    const bundleDoc = await db.collection("bundles").doc(productBoxId).get()
    if (bundleDoc.exists) {
      bundleData = bundleDoc.data()
      console.log("✅ [Direct] Found bundle:", bundleData?.title)
    } else {
      // Try product boxes
      const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      if (productBoxDoc.exists) {
        productBoxData = productBoxDoc.data()
        console.log("✅ [Direct] Found product box:", productBoxData?.title)
      } else {
        return NextResponse.json({ error: "Product not found" }, { status: 404 })
      }
    }

    const sourceData = bundleData || productBoxData
    const contentItemIds = sourceData?.contentItems || []

    console.log("📦 [Direct] Content item IDs:", contentItemIds)

    // Fetch detailed content metadata
    const contentMetadata = []
    for (const itemId of contentItemIds) {
      try {
        console.log(`🔍 [Direct] Fetching metadata for: ${itemId}`)

        const uploadDoc = await db.collection("uploads").doc(itemId).get()
        if (uploadDoc.exists) {
          const uploadData = uploadDoc.data()!

          const itemMetadata = {
            id: itemId,
            title: uploadData.title || uploadData.filename || uploadData.originalFileName || "Untitled",
            displayTitle: uploadData.title || uploadData.filename || uploadData.originalFileName || "Untitled",
            filename: uploadData.filename || uploadData.originalFileName || `${itemId}.file`,
            fileUrl: uploadData.fileUrl || uploadData.publicUrl || uploadData.downloadUrl || "",
            thumbnailUrl: uploadData.thumbnailUrl || uploadData.previewUrl || "",
            mimeType: uploadData.mimeType || uploadData.fileType || "application/octet-stream",
            fileSize: uploadData.fileSize || uploadData.size || 0,
            displaySize: formatFileSize(uploadData.fileSize || uploadData.size || 0),
            duration: uploadData.duration || uploadData.videoDuration || 0,
            displayDuration: uploadData.duration ? formatDuration(uploadData.duration) : null,
            resolution:
              uploadData.resolution ||
              uploadData.videoResolution ||
              (uploadData.height ? `${uploadData.height}p` : null),
            width: uploadData.width || uploadData.videoWidth,
            height: uploadData.height || uploadData.videoHeight,
            contentType: getContentType(uploadData.mimeType || uploadData.fileType || "application/octet-stream"),
            category: uploadData.category || uploadData.tag,
            tags: uploadData.tags || (uploadData.tag ? [uploadData.tag] : []),
            description: uploadData.description || "",
            creatorId: uploadData.creatorId || uploadData.userId || sourceData.creatorId,
            uploadedAt: uploadData.uploadedAt || uploadData.createdAt || new Date(),
            isPublic: uploadData.isPublic !== false,
          }

          console.log(`✅ [Direct] Enhanced item:`, {
            title: itemMetadata.displayTitle,
            fileUrl: itemMetadata.fileUrl,
            fileSize: itemMetadata.displaySize,
            contentType: itemMetadata.contentType,
          })

          contentMetadata.push(itemMetadata)
        } else {
          console.warn(`⚠️ [Direct] Upload not found: ${itemId}`)
        }
      } catch (error) {
        console.error(`❌ [Direct] Error fetching upload ${itemId}:`, error)
      }
    }

    // Helper functions
    function formatFileSize(bytes: number): string {
      if (bytes === 0) return "0 Bytes"
      const k = 1024
      const sizes = ["Bytes", "KB", "MB", "GB"]
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
    }

    function formatDuration(seconds: number): string {
      if (!seconds || seconds <= 0) return "0:00"
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.floor(seconds % 60)
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
    }

    function getContentType(mimeType: string): "video" | "audio" | "image" | "document" {
      if (mimeType.startsWith("video/")) return "video"
      if (mimeType.startsWith("audio/")) return "audio"
      if (mimeType.startsWith("image/")) return "image"
      return "document"
    }

    // Create comprehensive bundle purchase data
    const bundlePurchaseData = {
      // User identification
      buyerUid: buyerUid || "test-user",
      userId: buyerUid || "test-user",
      userEmail: userEmail || "test@example.com",
      userName: userEmail?.split("@")[0] || "Test User",
      isAuthenticated: !!(buyerUid && buyerUid !== "anonymous"),

      // Bundle information
      bundleId: productBoxId,
      bundleTitle: sourceData?.title || "Test Bundle",
      bundleDescription: sourceData?.description || "Test bundle description",
      thumbnailUrl: sourceData?.customPreviewThumbnail || sourceData?.thumbnailUrl || sourceData?.coverImage || "",

      // Content information with comprehensive metadata
      contents: contentMetadata,
      items: contentMetadata,
      itemNames: contentMetadata.map((item) => item.displayTitle),
      contentTitles: contentMetadata.map((item) => item.displayTitle),
      contentUrls: contentMetadata.map((item) => item.fileUrl).filter(Boolean),
      contentCount: contentMetadata.length,
      totalItems: contentMetadata.length,
      totalSize: contentMetadata.reduce((sum, item) => sum + (item.fileSize || 0), 0),

      // Purchase details
      amount: sourceData?.price || 2999,
      currency: "usd",
      sessionId: finalSessionId,
      status: "completed",
      type: "bundle",

      // Creator information
      creatorId: sourceData?.creatorId || "",
      creatorName: sourceData?.creatorName || "",
      creatorUsername: sourceData?.creatorUsername || "",

      // Timestamps
      purchasedAt: new Date(),
      createdAt: new Date(),
      completedAt: new Date(),
    }

    console.log("💾 [Direct] Saving bundle purchase with data:", {
      buyerUid: bundlePurchaseData.buyerUid,
      userEmail: bundlePurchaseData.userEmail,
      bundleTitle: bundlePurchaseData.bundleTitle,
      contentCount: bundlePurchaseData.contentCount,
      itemNames: bundlePurchaseData.itemNames,
      contentUrls: bundlePurchaseData.contentUrls.length,
    })

    // Save to bundlePurchases collection
    await db.collection("bundlePurchases").doc(finalSessionId).set(bundlePurchaseData)

    console.log("✅ [Direct] Bundle purchase created successfully")

    return NextResponse.json({
      success: true,
      sessionId: finalSessionId,
      purchase: bundlePurchaseData,
      contentFound: contentMetadata.length,
      message: "Bundle purchase created directly with full metadata",
    })
  } catch (error) {
    console.error("❌ [Direct] Error creating bundle purchase:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
