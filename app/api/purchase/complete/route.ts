import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { buyerUid, productBoxId, sessionId, amount, currency } = await request.json()

    console.log("🔍 [Purchase Complete] Processing:", { buyerUid, productBoxId })

    // Get the product box and its content
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!productBoxDoc.exists()) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const productBox = productBoxDoc.data()!
    const contentItems = productBox.contentItems || []

    console.log("📦 [Purchase Complete] Product box content items:", contentItems)

    // Fetch comprehensive metadata for each content item
    const contentMetadata = []
    for (const itemId of contentItems) {
      try {
        const uploadDoc = await db.collection("uploads").doc(itemId).get()
        if (uploadDoc.exists()) {
          const uploadData = uploadDoc.data()!

          // Extract comprehensive metadata matching the UI display
          const itemMetadata = {
            id: itemId,
            title: uploadData.title || uploadData.filename || uploadData.originalFileName || "Untitled",
            fileUrl: uploadData.fileUrl || uploadData.publicUrl || uploadData.downloadUrl,
            thumbnailUrl: uploadData.thumbnailUrl || uploadData.previewUrl || null,

            // File information
            mimeType: uploadData.mimeType || uploadData.fileType || "video/mp4",
            fileSize: uploadData.fileSize || uploadData.size || 0,
            filename: uploadData.filename || uploadData.originalFileName || `${itemId}.mp4`,

            // Video-specific metadata
            contentType: uploadData.contentType || uploadData.type || uploadData.category || "video",
            duration: uploadData.duration || uploadData.videoDuration || null,
            resolution: uploadData.resolution || uploadData.videoResolution || null,
            width: uploadData.width || uploadData.videoWidth || null,
            height: uploadData.height || uploadData.videoHeight || null,
            aspectRatio: uploadData.aspectRatio || null,

            // Quality and format info
            quality: uploadData.quality || null,
            format: uploadData.format || uploadData.videoFormat || null,
            codec: uploadData.codec || uploadData.videoCodec || null,
            bitrate: uploadData.bitrate || uploadData.videoBitrate || null,

            // Upload metadata
            uploadedAt: uploadData.uploadedAt || uploadData.createdAt || new Date(),
            creatorId: uploadData.creatorId || uploadData.userId || productBox.creatorId,

            // Additional metadata
            description: uploadData.description || null,
            tags: uploadData.tags || [],
            category: uploadData.category || null,
            isPublic: uploadData.isPublic || false,

            // Technical metadata
            encoding: uploadData.encoding || null,
            frameRate: uploadData.frameRate || uploadData.fps || null,
            audioCodec: uploadData.audioCodec || null,
            audioSampleRate: uploadData.audioSampleRate || null,

            // Display metadata (exactly as shown in UI)
            displayTitle: uploadData.title || uploadData.filename || "Untitled",
            displaySize: formatFileSize(uploadData.fileSize || 0),
            displayResolution: uploadData.resolution || (uploadData.height ? `${uploadData.height}p` : null),
            displayDuration: uploadData.duration ? formatDuration(uploadData.duration) : null,
          }

          console.log("📄 [Purchase Complete] Comprehensive item metadata:", itemMetadata)
          contentMetadata.push(itemMetadata)
        } else {
          console.warn(`⚠️ [Purchase Complete] Upload ${itemId} not found`)
        }
      } catch (error) {
        console.error(`❌ [Purchase Complete] Error fetching upload ${itemId}:`, error)
      }
    }

    // Helper functions for display formatting
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

    // Create comprehensive purchase record
    const purchaseData = {
      // Product information
      productBoxId,
      productTitle: productBox.title,
      productDescription: productBox.description,

      // Complete content metadata
      items: contentMetadata,
      contentItems: contentItems, // Keep for backward compatibility

      // Purchase details
      buyerUid,
      amount: amount || productBox.price,
      currency: currency || "usd",
      sessionId,
      status: "completed",
      type: "product_box",

      // Access information
      accessUrl: `/product-box/${productBoxId}/content`,
      coverImage: productBox.coverImage,

      // Timestamps
      purchasedAt: new Date(),
      createdAt: new Date(),
    }

    console.log("💾 [Purchase Complete] Saving purchase data:", purchaseData)

    // Save to main purchases collection
    const purchaseRef = await db.collection("purchases").add(purchaseData)

    // Also save to user's personal purchases with items subcollection
    const userPurchaseRef = await db.collection("users").doc(buyerUid).collection("purchases").add(purchaseData)

    // Store individual items in subcollection for easy access
    for (const item of contentMetadata) {
      await userPurchaseRef.collection("items").doc(item.id).set(item)
    }

    console.log("✅ [Purchase Complete] Purchase saved successfully")

    return NextResponse.json({
      success: true,
      purchase: purchaseData,
      purchaseId: purchaseRef.id,
      message: "Purchase completed and access granted",
    })
  } catch (error) {
    console.error("❌ [Purchase Complete] Error:", error)
    return NextResponse.json({ error: "Failed to complete purchase" }, { status: 500 })
  }
}
