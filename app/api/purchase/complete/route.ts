import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { buyerUid, productBoxId, sessionId, amount, currency, userEmail, userName } = await request.json()

    console.log("🔍 [Purchase Complete] Processing:", {
      buyerUid,
      productBoxId,
      userEmail,
      userName,
      sessionId,
    })

    // Verify user authentication if UID is provided
    let verifiedUser = null
    if (buyerUid && buyerUid !== "anonymous") {
      try {
        verifiedUser = await auth.getUser(buyerUid)
        console.log("✅ [Purchase Complete] User verified:", {
          uid: verifiedUser.uid,
          email: verifiedUser.email,
          displayName: verifiedUser.displayName,
        })
      } catch (error) {
        console.warn("⚠️ [Purchase Complete] Could not verify user:", error)
      }
    }

    // Try to get the product from productBoxes first
    let productDoc = await db.collection("productBoxes").doc(productBoxId).get()
    let isBundle = false

    if (!productDoc.exists()) {
      // Try bundles collection as fallback
      productDoc = await db.collection("bundles").doc(productBoxId).get()
      isBundle = true

      if (!productDoc.exists()) {
        console.error("❌ [Purchase Complete] Product not found in either collection:", productBoxId)
        return NextResponse.json({ error: "Product not found" }, { status: 404 })
      }
    }

    const productData = productDoc.data()!
    console.log("📦 [Purchase Complete] Product data:", {
      title: productData.title,
      contentItems: productData.contentItems?.length || 0,
      detailedContentItems: productData.detailedContentItems?.length || 0,
      isBundle,
    })

    // Extract content items with comprehensive metadata
    const contentItems = await extractContentItems(productBoxId, productData)
    console.log(`📊 [Purchase Complete] Extracted ${contentItems.length} content items`)

    // Create comprehensive purchase record
    const purchaseData = {
      // User identification
      buyerUid: buyerUid || "anonymous",
      userId: buyerUid || "anonymous",
      userEmail: userEmail || verifiedUser?.email || "",
      userName: userName || verifiedUser?.displayName || verifiedUser?.email?.split("@")[0] || "Anonymous User",
      isAuthenticated: !!(buyerUid && buyerUid !== "anonymous"),

      // Product information
      productBoxId,
      bundleId: productBoxId, // For compatibility
      productTitle: productData.title || "Untitled Product",
      bundleTitle: productData.title || "Untitled Bundle",
      productDescription: productData.description || "",
      bundleDescription: productData.description || "",
      thumbnailUrl: productData.customPreviewThumbnail || productData.thumbnailUrl || productData.coverImage || "",

      // Content metadata
      items: contentItems,
      contents: contentItems, // For compatibility
      contentItems: contentItems.map((item) => item.id), // Keep for backward compatibility
      itemNames: contentItems.map((item) => item.displayTitle),
      contentTitles: contentItems.map((item) => item.displayTitle),
      contentUrls: contentItems.map((item) => item.fileUrl).filter(Boolean),
      contentCount: contentItems.length,
      totalItems: contentItems.length,
      totalSize: contentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0),

      // Creator information
      creatorId: productData.creatorId || "",
      creatorName: productData.creatorName || "Creator",
      creatorUsername: productData.creatorUsername || "",

      // Purchase details
      amount: amount || productData.price || 0,
      currency: currency || "usd",
      sessionId,
      status: "completed",
      type: isBundle ? "bundle" : "product_box",

      // Access information
      accessUrl: `/product-box/${productBoxId}/content`,

      // Timestamps
      purchasedAt: new Date(),
      createdAt: new Date(),
      completedAt: new Date(),
    }

    console.log("💾 [Purchase Complete] Saving comprehensive purchase data:", {
      buyerUid: purchaseData.buyerUid,
      userEmail: purchaseData.userEmail,
      userName: purchaseData.userName,
      bundleTitle: purchaseData.bundleTitle,
      contentCount: purchaseData.contentCount,
      itemNames: purchaseData.itemNames.slice(0, 3), // Show first 3 items
      totalSize: purchaseData.totalSize,
    })

    // Save to bundlePurchases collection (primary)
    await db.collection("bundlePurchases").doc(sessionId).set(purchaseData)

    // Save to main purchases collection
    await db.collection("purchases").add(purchaseData)

    // Save to user's personal purchases if authenticated
    if (buyerUid && buyerUid !== "anonymous") {
      const userPurchaseRef = await db.collection("users").doc(buyerUid).collection("purchases").add(purchaseData)

      // Store individual items in subcollection for easy access
      for (const item of contentItems) {
        await userPurchaseRef.collection("items").doc(item.id).set(item)
      }

      // Update user profile with purchase info
      await db
        .collection("users")
        .doc(buyerUid)
        .update({
          lastPurchaseAt: new Date(),
          totalPurchases: db.FieldValue.increment(1),
          totalSpent: db.FieldValue.increment(purchaseData.amount),
        })
    }

    console.log("✅ [Purchase Complete] Purchase saved successfully with comprehensive metadata")

    return NextResponse.json({
      success: true,
      purchase: purchaseData,
      message: "Purchase completed and access granted",
    })
  } catch (error) {
    console.error("❌ [Purchase Complete] Error:", error)
    return NextResponse.json({ error: "Failed to complete purchase" }, { status: 500 })
  }
}

// Enhanced content extraction function
async function extractContentItems(productBoxId: string, productData: any) {
  const items: any[] = []

  try {
    console.log("🔍 [Content Extract] Starting extraction for:", productBoxId)

    // Method 1: Use detailedContentItems if available (most comprehensive)
    if (productData.detailedContentItems && Array.isArray(productData.detailedContentItems)) {
      console.log("✅ [Content Extract] Using detailedContentItems")
      return productData.detailedContentItems.map((item: any) => ({
        ...item,
        displayTitle: item.displayTitle || item.title || item.name || item.filename || "Untitled Content",
        displaySize: item.displaySize || formatFileSize(item.fileSize || 0),
      }))
    }

    // Method 2: Use contents array if available
    if (productData.contents && Array.isArray(productData.contents)) {
      console.log("✅ [Content Extract] Using contents array")
      return productData.contents.map((item: any) => ({
        ...item,
        displayTitle: item.displayTitle || item.title || item.name || item.filename || "Untitled Content",
        displaySize: item.displaySize || formatFileSize(item.fileSize || 0),
      }))
    }

    // Method 3: Use contentItems array and fetch from uploads
    if (productData.contentItems && Array.isArray(productData.contentItems)) {
      console.log(`🔍 [Content Extract] Fetching ${productData.contentItems.length} items from uploads`)

      for (const contentId of productData.contentItems) {
        try {
          const uploadDoc = await db.collection("uploads").doc(contentId).get()

          if (uploadDoc.exists()) {
            const uploadData = uploadDoc.data()!
            const enhancedItem = createEnhancedContentItem(contentId, uploadData)
            items.push(enhancedItem)
            console.log(`✅ [Content Extract] Enhanced item: ${enhancedItem.displayTitle}`)
          } else {
            console.warn(`⚠️ [Content Extract] Upload not found: ${contentId}`)
          }
        } catch (error) {
          console.error(`❌ [Content Extract] Error fetching ${contentId}:`, error)
        }
      }
    }

    // Method 4: Query uploads by productBoxId
    if (items.length === 0) {
      console.log("🔍 [Content Extract] Querying uploads by productBoxId")
      const uploadsSnapshot = await db.collection("uploads").where("productBoxId", "==", productBoxId).get()

      uploadsSnapshot.forEach((doc) => {
        const uploadData = doc.data()
        const enhancedItem = createEnhancedContentItem(doc.id, uploadData)
        items.push(enhancedItem)
      })
    }

    console.log(`✅ [Content Extract] Final count: ${items.length} items`)
    return items
  } catch (error) {
    console.error("❌ [Content Extract] Error:", error)
    return []
  }
}

// Helper function to create enhanced content item
function createEnhancedContentItem(id: string, data: any) {
  const title = data.title || data.filename || data.originalFileName || "Untitled"
  const displayTitle = title.replace(/\.(mp4|mov|avi|mkv|webm|m4v|mp3|wav|jpg|jpeg|png|gif|pdf)$/i, "")

  return {
    id,
    title: displayTitle,
    displayTitle,
    filename: data.filename || data.originalFileName || `${displayTitle}.file`,
    fileUrl: data.fileUrl || data.publicUrl || data.url || data.downloadUrl || "",
    thumbnailUrl: data.thumbnailUrl || data.previewUrl || "",

    // File metadata
    mimeType: data.mimeType || data.fileType || "application/octet-stream",
    fileSize: data.fileSize || data.size || 0,
    displaySize: formatFileSize(data.fileSize || data.size || 0),

    // Video/Audio metadata
    duration: data.duration || data.videoDuration || 0,
    displayDuration: data.duration ? formatDuration(data.duration) : null,
    resolution: data.resolution || data.videoResolution || (data.height ? `${data.height}p` : null),
    width: data.width || data.videoWidth,
    height: data.height || data.videoHeight,

    // Content classification
    contentType: getContentType(data.mimeType || data.fileType || "application/octet-stream"),
    category: data.category || data.tag,
    tags: data.tags || (data.tag ? [data.tag] : []),

    // Additional metadata
    description: data.description || "",
    creatorId: data.creatorId || data.userId,
    uploadedAt: data.uploadedAt || data.createdAt || new Date(),
    isPublic: data.isPublic !== false,
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
