import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { buyerUid, productBoxId, sessionId, amount, currency, userEmail } = await request.json()

    console.log("🔍 [Purchase Complete] Processing:", { buyerUid, productBoxId, userEmail })

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

    // Get the product box and its content
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!productBoxDoc.exists()) {
      // Try bundles collection as fallback
      const bundleDoc = await db.collection("bundles").doc(productBoxId).get()
      if (!bundleDoc.exists()) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 })
      }

      const bundleData = bundleDoc.data()!
      return await handleBundlePurchase(request, {
        buyerUid,
        bundleId: productBoxId,
        sessionId,
        amount,
        currency,
        userEmail,
        verifiedUser,
        bundleData,
      })
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

    // Create comprehensive purchase record with proper user identification
    const purchaseData = {
      // User identification - CRITICAL FIX
      buyerUid: buyerUid || "anonymous",
      userId: buyerUid || "anonymous",
      userEmail: userEmail || verifiedUser?.email || "",
      userName: verifiedUser?.displayName || verifiedUser?.email?.split("@")[0] || "Anonymous User",
      isAuthenticated: !!(buyerUid && buyerUid !== "anonymous"),

      // Product information
      productBoxId,
      productTitle: productBox.title,
      productDescription: productBox.description,

      // Complete content metadata with proper names
      items: contentMetadata,
      contentItems: contentItems, // Keep for backward compatibility
      itemNames: contentMetadata.map((item) => item.displayTitle), // Explicit content names
      contentTitles: contentMetadata.map((item) => item.displayTitle), // Alternative field name

      // Purchase details
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

    console.log("💾 [Purchase Complete] Saving purchase data with user identification:", {
      buyerUid: purchaseData.buyerUid,
      userEmail: purchaseData.userEmail,
      userName: purchaseData.userName,
      isAuthenticated: purchaseData.isAuthenticated,
      itemNames: purchaseData.itemNames,
    })

    // Save to main purchases collection
    const purchaseRef = await db.collection("purchases").add(purchaseData)

    // Save to bundlePurchases collection with proper user identification
    const bundlePurchaseData = {
      ...purchaseData,
      bundleId: productBoxId,
      bundleTitle: productBox.title,
      bundleDescription: productBox.description,
      contents: contentMetadata,
      contentCount: contentMetadata.length,
      totalItems: contentMetadata.length,
      totalSize: contentMetadata.reduce((sum, item) => sum + (item.fileSize || 0), 0),
    }

    await db.collection("bundlePurchases").doc(sessionId).set(bundlePurchaseData)

    // Also save to user's personal purchases if authenticated
    if (buyerUid && buyerUid !== "anonymous") {
      const userPurchaseRef = await db.collection("users").doc(buyerUid).collection("purchases").add(purchaseData)

      // Store individual items in subcollection for easy access
      for (const item of contentMetadata) {
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

    console.log("✅ [Purchase Complete] Purchase saved successfully with proper user identification")

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

// Handle bundle purchases specifically
async function handleBundlePurchase(request: NextRequest, data: any) {
  const { buyerUid, bundleId, sessionId, amount, currency, userEmail, verifiedUser, bundleData } = data

  console.log("🎁 [Bundle Purchase] Processing bundle purchase:", { bundleId, buyerUid, userEmail })

  // Get bundle contents with proper names
  let bundleContents: any[] = []
  if (bundleData.contents && Array.isArray(bundleData.contents)) {
    bundleContents = bundleData.contents.map((item: any) => ({
      ...item,
      displayTitle: item.title || item.name || item.filename || "Untitled Content",
      displaySize: item.fileSize ? formatFileSize(item.fileSize) : "Unknown Size",
    }))
  } else if (bundleData.items && Array.isArray(bundleData.items)) {
    bundleContents = bundleData.items.map((item: any) => ({
      ...item,
      displayTitle: item.title || item.name || item.filename || "Untitled Content",
      displaySize: item.fileSize ? formatFileSize(item.fileSize) : "Unknown Size",
    }))
  }

  const bundlePurchaseData = {
    // User identification - CRITICAL FIX
    buyerUid: buyerUid || "anonymous",
    userId: buyerUid || "anonymous",
    userEmail: userEmail || verifiedUser?.email || "",
    userName: verifiedUser?.displayName || verifiedUser?.email?.split("@")[0] || "Anonymous User",
    isAuthenticated: !!(buyerUid && buyerUid !== "anonymous"),

    // Bundle information
    bundleId,
    bundleTitle: bundleData.title || "Untitled Bundle",
    bundleDescription: bundleData.description || "",
    thumbnailUrl: bundleData.customPreviewThumbnail || bundleData.thumbnailUrl || "",

    // Content information with proper names
    contents: bundleContents,
    items: bundleContents,
    itemNames: bundleContents.map((item) => item.displayTitle),
    contentTitles: bundleContents.map((item) => item.displayTitle),
    contentCount: bundleContents.length,
    totalItems: bundleContents.length,
    totalSize: bundleContents.reduce((sum, item) => sum + (item.fileSize || 0), 0),

    // Purchase details
    amount: amount || bundleData.price || 0,
    currency: currency || "usd",
    sessionId,
    status: "completed",
    type: "bundle",

    // Timestamps
    purchasedAt: new Date(),
    createdAt: new Date(),
    completedAt: new Date(),
  }

  console.log("💾 [Bundle Purchase] Saving bundle purchase with user identification:", {
    buyerUid: bundlePurchaseData.buyerUid,
    userEmail: bundlePurchaseData.userEmail,
    userName: bundlePurchaseData.userName,
    itemNames: bundlePurchaseData.itemNames,
  })

  // Save to bundlePurchases collection
  await db.collection("bundlePurchases").doc(sessionId).set(bundlePurchaseData)

  // Save to main purchases collection
  await db.collection("purchases").add(bundlePurchaseData)

  // Save to user's personal purchases if authenticated
  if (buyerUid && buyerUid !== "anonymous") {
    await db.collection("users").doc(buyerUid).collection("purchases").add(bundlePurchaseData)

    // Update user profile
    await db
      .collection("users")
      .doc(buyerUid)
      .update({
        lastPurchaseAt: new Date(),
        totalPurchases: db.FieldValue.increment(1),
        totalSpent: db.FieldValue.increment(bundlePurchaseData.amount),
      })
  }

  console.log("✅ [Bundle Purchase] Bundle purchase saved successfully")

  return NextResponse.json({
    success: true,
    purchase: bundlePurchaseData,
    message: "Bundle purchase completed and access granted",
  })
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}
