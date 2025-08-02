import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { buyerUid, productBoxId, sessionId, amount, currency, userEmail } = await request.json()

    console.log("🔍 [Purchase Complete] Processing with buyer identification:", {
      buyerUid,
      productBoxId,
      userEmail,
      sessionId,
    })

    // CRITICAL: Validate buyer UID is provided
    if (!buyerUid) {
      console.error("❌ [Purchase Complete] CRITICAL: Missing buyerUid")
      return NextResponse.json({ error: "Buyer identification required" }, { status: 400 })
    }

    // Verify user authentication and get comprehensive user details
    let verifiedUser = null
    let userEmail_verified = userEmail || ""
    let userName = "User"
    let isAuthenticated = false

    if (buyerUid && buyerUid !== "anonymous" && !buyerUid.startsWith("anonymous_")) {
      try {
        verifiedUser = await auth.getUser(buyerUid)
        userEmail_verified = verifiedUser.email || userEmail || ""
        userName = verifiedUser.displayName || verifiedUser.email?.split("@")[0] || "User"
        isAuthenticated = true

        console.log("✅ [Purchase Complete] User verified:", {
          uid: verifiedUser.uid,
          email: userEmail_verified,
          displayName: userName,
        })
      } catch (error) {
        console.warn("⚠️ [Purchase Complete] Could not verify user:", error)
        // For anonymous purchases, continue with provided email
        if (userEmail) {
          userEmail_verified = userEmail
          userName = userEmail.split("@")[0] || "Anonymous User"
          isAuthenticated = false
        }
      }
    } else {
      // Handle anonymous purchases
      if (userEmail) {
        userEmail_verified = userEmail
        userName = userEmail.split("@")[0] || "Anonymous User"
        isAuthenticated = false
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
        userEmail: userEmail_verified,
        userName,
        isAuthenticated,
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

    // Create comprehensive purchase record with ENHANCED buyer identification
    const purchaseData = {
      // CRITICAL: Enhanced user identification
      buyerUid: buyerUid,
      userId: buyerUid,
      userEmail: userEmail_verified,
      userName: userName,
      isAuthenticated: isAuthenticated,

      // Additional buyer verification fields
      buyerVerification: {
        uid: buyerUid,
        email: userEmail_verified,
        name: userName,
        isVerified: isAuthenticated,
        verificationMethod: isAuthenticated ? "firebase_auth" : "email_only",
        verifiedAt: new Date(),
      },

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
      completedAt: new Date(),
    }

    console.log("💾 [Purchase Complete] Saving purchase data with enhanced buyer identification:", {
      buyerUid: purchaseData.buyerUid,
      userEmail: purchaseData.userEmail,
      userName: purchaseData.userName,
      isAuthenticated: purchaseData.isAuthenticated,
      itemNames: purchaseData.itemNames,
      verificationMethod: purchaseData.buyerVerification.verificationMethod,
    })

    // Save to main purchases collection
    const purchaseRef = await db.collection("purchases").add(purchaseData)

    // Save to bundlePurchases collection with enhanced buyer identification
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

    // Save to user's personal purchases if authenticated
    if (buyerUid && buyerUid !== "anonymous" && !buyerUid.startsWith("anonymous_")) {
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
    } else {
      // For anonymous purchases, save to separate collection
      await db.collection("anonymousPurchases").doc(sessionId).set(purchaseData)
    }

    console.log("✅ [Purchase Complete] Purchase saved successfully with enhanced buyer identification")

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

// Handle bundle purchases with enhanced buyer identification
async function handleBundlePurchase(request: NextRequest, data: any) {
  const {
    buyerUid,
    bundleId,
    sessionId,
    amount,
    currency,
    userEmail,
    userName,
    isAuthenticated,
    verifiedUser,
    bundleData,
  } = data

  console.log("🎁 [Bundle Purchase] Processing bundle purchase with buyer identification:", {
    bundleId,
    buyerUid,
    userEmail,
    userName,
    isAuthenticated,
  })

  // Get bundle contents with comprehensive metadata extraction
  let bundleContents: any[] = []

  // Method 1: Use detailedContentItems if available (most comprehensive)
  if (bundleData.detailedContentItems && Array.isArray(bundleData.detailedContentItems)) {
    console.log("✅ [Bundle Purchase] Using detailedContentItems from bundle")
    bundleContents = bundleData.detailedContentItems.map((item: any) => ({
      ...item,
      displayTitle: item.displayTitle || item.title || item.name || item.filename || "Untitled Content",
      displaySize: item.displaySize || (item.fileSize ? formatFileSize(item.fileSize) : "Unknown Size"),
    }))
  }
  // Method 2: Use contents array if available
  else if (bundleData.contents && Array.isArray(bundleData.contents)) {
    console.log("✅ [Bundle Purchase] Using contents array from bundle")
    bundleContents = bundleData.contents.map((item: any) => ({
      ...item,
      displayTitle: item.displayTitle || item.title || item.name || item.filename || "Untitled Content",
      displaySize: item.displaySize || (item.fileSize ? formatFileSize(item.fileSize) : "Unknown Size"),
    }))
  }
  // Method 3: Use contentItems array and fetch detailed metadata
  else if (bundleData.contentItems && Array.isArray(bundleData.contentItems)) {
    console.log("🔍 [Bundle Purchase] Fetching detailed metadata for contentItems")

    for (const contentId of bundleData.contentItems) {
      try {
        console.log(`🔍 [Bundle Purchase] Fetching metadata for: ${contentId}`)

        // Try uploads collection first
        let contentData = null
        const uploadDoc = await db.collection("uploads").doc(contentId).get()

        if (uploadDoc.exists) {
          contentData = uploadDoc.data()
          console.log(`✅ [Bundle Purchase] Found in uploads:`, {
            title: contentData?.title,
            filename: contentData?.filename,
            fileUrl: contentData?.fileUrl,
            fileSize: contentData?.fileSize || contentData?.size,
          })
        } else {
          // Try productBoxContent as fallback
          const productBoxContentDoc = await db.collection("productBoxContent").doc(contentId).get()
          if (productBoxContentDoc.exists) {
            contentData = productBoxContentDoc.data()
            console.log(`✅ [Bundle Purchase] Found in productBoxContent`)

            // If we have an uploadId, get the original upload data
            if (contentData?.uploadId) {
              const originalUpload = await db.collection("uploads").doc(contentData.uploadId).get()
              if (originalUpload.exists) {
                const originalData = originalUpload.data()
                contentData = { ...contentData, ...originalData }
                console.log(`✅ [Bundle Purchase] Enhanced with original upload data`)
              }
            }
          }
        }

        if (contentData) {
          const enhancedItem = {
            id: contentId,
            title: contentData.title || contentData.filename || contentData.originalFileName || "Untitled",
            displayTitle: contentData.title || contentData.filename || contentData.originalFileName || "Untitled",
            filename: contentData.filename || contentData.originalFileName || `${contentId}.file`,
            fileUrl: contentData.fileUrl || contentData.publicUrl || contentData.url || contentData.downloadUrl || "",
            thumbnailUrl: contentData.thumbnailUrl || contentData.previewUrl || "",

            // File metadata
            mimeType: contentData.mimeType || contentData.fileType || "application/octet-stream",
            fileSize: contentData.fileSize || contentData.size || 0,
            displaySize: formatFileSize(contentData.fileSize || contentData.size || 0),

            // Video/Audio metadata
            duration: contentData.duration || contentData.videoDuration || 0,
            displayDuration: contentData.duration ? formatDuration(contentData.duration) : null,
            resolution:
              contentData.resolution ||
              contentData.videoResolution ||
              (contentData.height ? `${contentData.height}p` : null),
            width: contentData.width || contentData.videoWidth,
            height: contentData.height || contentData.videoHeight,

            // Content classification
            contentType: getContentType(contentData.mimeType || contentData.fileType || "application/octet-stream"),
            category: contentData.category || contentData.tag,
            tags: contentData.tags || (contentData.tag ? [contentData.tag] : []),

            // Additional metadata
            description: contentData.description || "",
            creatorId: contentData.creatorId || contentData.userId || bundleData.creatorId,
            uploadedAt: contentData.uploadedAt || contentData.createdAt || new Date(),
            isPublic: contentData.isPublic !== false,
          }

          console.log(`✅ [Bundle Purchase] Enhanced item:`, {
            title: enhancedItem.displayTitle,
            fileUrl: enhancedItem.fileUrl,
            fileSize: enhancedItem.displaySize,
            contentType: enhancedItem.contentType,
          })

          bundleContents.push(enhancedItem)
        } else {
          console.warn(`⚠️ [Bundle Purchase] No data found for content: ${contentId}`)
        }
      } catch (error) {
        console.error(`❌ [Bundle Purchase] Error fetching content ${contentId}:`, error)
      }
    }
  }

  console.log(`📊 [Bundle Purchase] Final bundle contents: ${bundleContents.length} items`)
  console.log(
    `📝 [Bundle Purchase] Content titles:`,
    bundleContents.map((item) => item.displayTitle),
  )

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

  const bundlePurchaseData = {
    // CRITICAL: Enhanced user identification
    buyerUid: buyerUid,
    userId: buyerUid,
    userEmail: userEmail,
    userName: userName,
    isAuthenticated: isAuthenticated,

    // Additional buyer verification fields
    buyerVerification: {
      uid: buyerUid,
      email: userEmail,
      name: userName,
      isVerified: isAuthenticated,
      verificationMethod: isAuthenticated ? "firebase_auth" : "email_only",
      verifiedAt: new Date(),
    },

    // Bundle information
    bundleId,
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
    amount: amount || bundleData.price || 0,
    currency: currency || "usd",
    sessionId,
    status: "completed",
    type: "bundle",

    // Creator information
    creatorId: bundleData.creatorId || "",
    creatorName: bundleData.creatorName || "",
    creatorUsername: bundleData.creatorUsername || "",

    // Timestamps
    purchasedAt: new Date(),
    createdAt: new Date(),
    completedAt: new Date(),
  }

  console.log("💾 [Bundle Purchase] Saving comprehensive bundle purchase with enhanced buyer identification:", {
    buyerUid: bundlePurchaseData.buyerUid,
    userEmail: bundlePurchaseData.userEmail,
    userName: bundlePurchaseData.userName,
    bundleTitle: bundlePurchaseData.bundleTitle,
    contentCount: bundlePurchaseData.contentCount,
    itemNames: bundlePurchaseData.itemNames,
    contentUrls: bundlePurchaseData.contentUrls.length,
    isAuthenticated: bundlePurchaseData.isAuthenticated,
    verificationMethod: bundlePurchaseData.buyerVerification.verificationMethod,
  })

  // Save to bundlePurchases collection
  await db.collection("bundlePurchases").doc(sessionId).set(bundlePurchaseData)

  // Save to main purchases collection
  await db.collection("purchases").add(bundlePurchaseData)

  // Save to user's personal purchases if authenticated
  if (buyerUid && buyerUid !== "anonymous" && !buyerUid.startsWith("anonymous_")) {
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
  } else {
    // For anonymous purchases, save to separate collection
    await db.collection("anonymousPurchases").doc(sessionId).set(bundlePurchaseData)
  }

  console.log("✅ [Bundle Purchase] Bundle purchase saved successfully with enhanced buyer identification")

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
