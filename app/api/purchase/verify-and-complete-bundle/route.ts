import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { verifyIdToken } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, productBoxId, forceComplete } = await request.json()

    console.log("🔍 [Bundle Verification] Starting comprehensive bundle purchase verification:", {
      sessionId,
      productBoxId,
      forceComplete,
    })

    // Get user authentication from request headers
    let authenticatedUser = null
    try {
      authenticatedUser = await verifyIdToken(request)
      console.log("✅ [Bundle Verification] Authenticated user:", authenticatedUser?.uid)
    } catch (error) {
      console.log("ℹ️ [Bundle Verification] No authenticated user, proceeding as anonymous")
    }

    const buyerUid = authenticatedUser?.uid || "anonymous"
    const userEmail = authenticatedUser?.email || ""
    const userName = authenticatedUser?.name || authenticatedUser?.email?.split("@")[0] || "Anonymous User"

    console.log("👤 [Bundle Verification] User details:", { buyerUid, userEmail, userName })

    // Check if this purchase already exists
    const existingPurchase = await db.collection("bundlePurchases").doc(sessionId).get()

    if (existingPurchase.exists() && !forceComplete) {
      const purchaseData = existingPurchase.data()!
      console.log("✅ [Bundle Verification] Purchase already exists with content count:", purchaseData.contentCount)

      // If content count is 0, we need to fix it
      if (purchaseData.contentCount === 0 || !purchaseData.contents?.length) {
        console.log("🔧 [Bundle Verification] Existing purchase has no content, fixing...")
      } else {
        return NextResponse.json({
          success: true,
          purchase: purchaseData,
          message: "Purchase already completed",
        })
      }
    }

    // Get the bundle/product box data
    let bundleData = null
    let bundleSource = ""

    // Try bundles collection first
    const bundleDoc = await db.collection("bundles").doc(productBoxId).get()
    if (bundleDoc.exists()) {
      bundleData = bundleDoc.data()!
      bundleSource = "bundles"
      console.log("📦 [Bundle Verification] Found bundle data:", {
        title: bundleData.title,
        contentItems: bundleData.contentItems?.length || 0,
        detailedContentItems: bundleData.detailedContentItems?.length || 0,
      })
    } else {
      // Try productBoxes collection
      const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      if (productBoxDoc.exists()) {
        bundleData = productBoxDoc.data()!
        bundleSource = "productBoxes"
        console.log("📦 [Bundle Verification] Found product box data:", {
          title: bundleData.title,
          contentItems: bundleData.contentItems?.length || 0,
        })
      }
    }

    if (!bundleData) {
      throw new Error(`Bundle/Product box ${productBoxId} not found`)
    }

    // Extract comprehensive bundle content metadata
    console.log("🔍 [Bundle Verification] Extracting comprehensive bundle content...")

    const bundleContents: any[] = []

    // Method 1: Use detailedContentItems if available (most comprehensive)
    if (bundleData.detailedContentItems && Array.isArray(bundleData.detailedContentItems)) {
      console.log("✅ [Bundle Verification] Using detailedContentItems from bundle")
      bundleContents.push(...bundleData.detailedContentItems.map((item: any) => enhanceContentItem(item)))
    }
    // Method 2: Use contentItems and fetch from uploads
    else if (bundleData.contentItems && Array.isArray(bundleData.contentItems)) {
      console.log(`🔍 [Bundle Verification] Fetching content for ${bundleData.contentItems.length} content items`)

      for (const contentId of bundleData.contentItems) {
        try {
          console.log(`📄 [Bundle Verification] Fetching content: ${contentId}`)

          // Try uploads collection first
          const uploadDoc = await db.collection("uploads").doc(contentId).get()
          if (uploadDoc.exists()) {
            const uploadData = uploadDoc.data()!
            const enhancedItem = enhanceContentItem({
              id: contentId,
              ...uploadData,
            })
            bundleContents.push(enhancedItem)
            console.log(`✅ [Bundle Verification] Added from uploads: ${enhancedItem.displayTitle}`)
            continue
          }

          // Try productBoxContent as fallback
          let contentData = null
          const contentDoc = await db.collection("productBoxContent").doc(contentId).get()
          if (contentDoc.exists()) {
            contentData = contentDoc.data()!

            // If we have an uploadId, get the original upload data
            if (contentData.uploadId) {
              const originalUpload = await db.collection("uploads").doc(contentData.uploadId).get()
              if (originalUpload.exists()) {
                const originalData = originalUpload.data()!
                contentData = { ...contentData, ...originalData }
              }
            }

            const enhancedItem = enhanceContentItem({
              id: contentId,
              ...contentData,
            })
            bundleContents.push(enhancedItem)
            console.log(`✅ [Bundle Verification] Added from productBoxContent: ${enhancedItem.displayTitle}`)
          } else {
            console.warn(`⚠️ [Bundle Verification] Content not found: ${contentId}`)
          }
        } catch (error) {
          console.error(`❌ [Bundle Verification] Error fetching content ${contentId}:`, error)
        }
      }
    }

    // Helper function to enhance content items with proper metadata
    function enhanceContentItem(item: any): any {
      const title = item.title || item.filename || item.originalFileName || item.name || "Untitled"
      const displayTitle = title.replace(/\.(mp4|mov|avi|mkv|webm|m4v|mp3|wav|jpg|jpeg|png|gif|pdf)$/i, "")

      return {
        id: item.id || item.uploadId || "",
        title: displayTitle,
        displayTitle,
        filename: item.filename || item.originalFileName || `${displayTitle}.file`,
        fileUrl: item.fileUrl || item.publicUrl || item.url || item.downloadUrl || "",
        thumbnailUrl: item.thumbnailUrl || item.previewUrl || "",

        // File metadata
        mimeType: item.mimeType || item.fileType || "application/octet-stream",
        fileSize: item.fileSize || item.size || 0,
        displaySize: formatFileSize(item.fileSize || item.size || 0),

        // Video/Audio metadata
        duration: item.duration || item.videoDuration || 0,
        displayDuration: item.duration ? formatDuration(item.duration) : null,
        resolution: item.resolution || item.videoResolution || (item.height ? `${item.height}p` : null),
        width: item.width || item.videoWidth,
        height: item.height || item.videoHeight,

        // Content classification
        contentType: getContentType(item.mimeType || item.fileType || "application/octet-stream"),
        category: item.category || item.tag,
        tags: item.tags || (item.tag ? [item.tag] : []),

        // Additional metadata
        description: item.description || "",
        creatorId: item.creatorId || item.userId || bundleData.creatorId,
        uploadedAt: item.uploadedAt || item.createdAt || new Date(),
        isPublic: item.isPublic !== false,
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

    console.log(`📊 [Bundle Verification] Extracted ${bundleContents.length} content items`)
    console.log(
      `📝 [Bundle Verification] Content details:`,
      bundleContents.map((item) => ({
        title: item.displayTitle,
        fileUrl: !!item.fileUrl,
        size: item.displaySize,
        contentType: item.contentType,
      })),
    )

    // Create comprehensive bundle purchase record
    const bundlePurchaseData = {
      // User identification
      buyerUid,
      userId: buyerUid,
      userEmail,
      userName,
      isAuthenticated: buyerUid !== "anonymous",

      // Bundle information
      bundleId: productBoxId,
      bundleTitle: bundleData.title || "Untitled Bundle",
      bundleDescription: bundleData.description || "",
      thumbnailUrl: bundleData.customPreviewThumbnail || bundleData.thumbnailUrl || bundleData.coverImage || "",

      // Content information with comprehensive metadata
      contents: bundleContents,
      items: bundleContents,
      itemNames: bundleContents.map((item) => item.displayTitle),
      contentTitles: bundleContents.map((item) => item.displayTitle),
      contentUrls: bundleContents.map((item) => item.fileUrl).filter(Boolean),
      contentCount: bundleContents.length,
      totalItems: bundleContents.length,
      totalSize: bundleContents.reduce((sum, item) => sum + (item.fileSize || 0), 0),

      // Purchase details
      amount: bundleData.price || 0,
      currency: "usd",
      sessionId,
      status: "completed",
      type: bundleSource === "bundles" ? "bundle" : "product_box",

      // Creator information
      creatorId: bundleData.creatorId || "",
      creatorName: bundleData.creatorName || "",
      creatorUsername: bundleData.creatorUsername || "",

      // Timestamps
      purchasedAt: new Date(),
      createdAt: new Date(),
      completedAt: new Date(),
      verifiedAt: new Date(),
    }

    console.log("💾 [Bundle Verification] Saving comprehensive bundle purchase:", {
      buyerUid: bundlePurchaseData.buyerUid,
      bundleTitle: bundlePurchaseData.bundleTitle,
      contentCount: bundlePurchaseData.contentCount,
      itemNames: bundlePurchaseData.itemNames.slice(0, 3),
      totalUrls: bundlePurchaseData.contentUrls.length,
    })

    // Save to bundlePurchases collection
    await db.collection("bundlePurchases").doc(sessionId).set(bundlePurchaseData)

    // Also save to user's personal purchases if authenticated
    if (buyerUid !== "anonymous") {
      await db.collection("users").doc(buyerUid).collection("purchases").doc(sessionId).set(bundlePurchaseData)
    }

    console.log("✅ [Bundle Verification] Bundle purchase verified and saved successfully")

    return NextResponse.json({
      success: true,
      purchase: bundlePurchaseData,
      message: "Bundle purchase verified and completed successfully",
    })
  } catch (error) {
    console.error("❌ [Bundle Verification] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
