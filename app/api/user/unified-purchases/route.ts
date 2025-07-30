import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb, getAdminAuth } from "@/lib/firebase-server"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Unified Purchases] Starting unified purchases fetch...")

    // Get user ID from query params or auth header
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const authHeader = request.headers.get("authorization")

    let finalUserId = userId

    // If no userId provided, try to get from auth token
    if (!finalUserId && authHeader?.startsWith("Bearer ")) {
      try {
        const idToken = authHeader.split("Bearer ")[1]
        const decodedToken = await getAdminAuth().verifyIdToken(idToken)
        finalUserId = decodedToken.uid
        console.log("✅ [Unified Purchases] User ID from token:", finalUserId)
      } catch (error) {
        console.error("❌ [Unified Purchases] Token verification failed:", error)
        return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
      }
    }

    if (!finalUserId) {
      console.error("❌ [Unified Purchases] No user ID provided")
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("🔍 [Unified Purchases] Fetching purchases for user:", finalUserId)

    const db = getAdminDb()
    const purchases = []

    // Strategy 1: Get from bundlePurchases collection (most complete data)
    console.log("📦 [Unified Purchases] Fetching from bundlePurchases collection...")
    try {
      const bundlePurchasesQuery = await db
        .collection("bundlePurchases")
        .where("userId", "==", finalUserId)
        .orderBy("purchasedAt", "desc")
        .get()

      console.log(`📦 [Unified Purchases] Found ${bundlePurchasesQuery.size} bundle purchases`)

      bundlePurchasesQuery.forEach((doc) => {
        const data = doc.data()
        console.log("📦 [Bundle Purchase]:", {
          id: doc.id,
          title: data.productBoxTitle || data.bundleTitle,
          hasDownloadUrl: !!(data.downloadUrl || data.items?.[0]?.fileUrl),
          itemsCount: data.items?.length || 0,
        })

        const purchase = normalizePurchaseData(doc.id, data, "bundlePurchases")
        if (purchase) {
          purchases.push(purchase)
        }
      })
    } catch (error) {
      console.error("❌ [Unified Purchases] Error fetching bundle purchases:", error)
    }

    // Strategy 2: Get from user's purchases subcollection
    console.log("👤 [Unified Purchases] Fetching from user purchases subcollection...")
    try {
      const userPurchasesQuery = await db
        .collection("users")
        .doc(finalUserId)
        .collection("purchases")
        .orderBy("purchasedAt", "desc")
        .get()

      console.log(`👤 [Unified Purchases] Found ${userPurchasesQuery.size} user purchases`)

      for (const doc of userPurchasesQuery.docs) {
        const data = doc.data()

        // Skip if we already have this purchase from bundlePurchases
        if (purchases.some((p) => p.sessionId === data.sessionId)) {
          console.log("⏭️ [Unified Purchases] Skipping duplicate purchase:", data.sessionId)
          continue
        }

        console.log("👤 [User Purchase]:", {
          id: doc.id,
          sessionId: data.sessionId,
          bundleId: data.bundleId || data.productBoxId,
          hasItems: !!(data.items?.length || data.contents?.length),
        })

        // If this purchase doesn't have complete data, try to enhance it
        let enhancedData = data
        if (!data.items?.length && !data.contents?.length && (data.bundleId || data.productBoxId)) {
          console.log("🔄 [Unified Purchases] Enhancing purchase with bundle data...")
          enhancedData = await enhancePurchaseWithBundleData(data, db)
        }

        const purchase = normalizePurchaseData(doc.id, enhancedData, "userPurchases")
        if (purchase) {
          purchases.push(purchase)
        }
      }
    } catch (error) {
      console.error("❌ [Unified Purchases] Error fetching user purchases:", error)
    }

    // Strategy 3: Get from main purchases collection as fallback
    console.log("🔍 [Unified Purchases] Fetching from main purchases collection...")
    try {
      const mainPurchasesQuery = await db
        .collection("purchases")
        .where("userId", "==", finalUserId)
        .orderBy("createdAt", "desc")
        .get()

      console.log(`🔍 [Unified Purchases] Found ${mainPurchasesQuery.size} main purchases`)

      for (const doc of mainPurchasesQuery.docs) {
        const data = doc.data()

        // Skip if we already have this purchase
        if (purchases.some((p) => p.sessionId === data.sessionId)) {
          console.log("⏭️ [Unified Purchases] Skipping duplicate purchase:", data.sessionId)
          continue
        }

        console.log("🔍 [Main Purchase]:", {
          id: doc.id,
          sessionId: data.sessionId,
          bundleId: data.bundleId || data.productBoxId,
          status: data.status,
        })

        // Enhance with bundle data if needed
        let enhancedData = data
        if (!data.items?.length && !data.contents?.length && (data.bundleId || data.productBoxId)) {
          console.log("🔄 [Unified Purchases] Enhancing main purchase with bundle data...")
          enhancedData = await enhancePurchaseWithBundleData(data, db)
        }

        const purchase = normalizePurchaseData(doc.id, enhancedData, "purchases")
        if (purchase) {
          purchases.push(purchase)
        }
      }
    } catch (error) {
      console.error("❌ [Unified Purchases] Error fetching main purchases:", error)
    }

    // Remove duplicates and sort by purchase date
    const uniquePurchases = purchases
      .filter((purchase, index, self) => index === self.findIndex((p) => p.sessionId === purchase.sessionId))
      .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())

    console.log(`✅ [Unified Purchases] Returning ${uniquePurchases.length} unique purchases`)
    console.log(
      "📊 [Unified Purchases] Purchase summary:",
      uniquePurchases.map((p) => ({
        title: p.productBoxTitle,
        itemsCount: p.totalItems,
        hasDownloadUrl: p.items.some((item) => !!item.fileUrl),
        purchaseDate: p.purchasedAt,
      })),
    )

    return NextResponse.json({
      success: true,
      purchases: uniquePurchases,
      totalCount: uniquePurchases.length,
    })
  } catch (error: any) {
    console.error("❌ [Unified Purchases] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

// Normalize purchase data to unified format
function normalizePurchaseData(id: string, data: any, source: string): any | null {
  try {
    // Get bundle/product box ID
    const bundleId = data.bundleId || data.productBoxId || data.itemId
    if (!bundleId) {
      console.warn(`⚠️ [Normalize] Skipping purchase ${id} - no bundle/product ID`)
      return null
    }

    // Get items from various possible fields
    let items = data.items || data.contents || []

    // If no items but we have bundle data, create item from bundle
    if (!items.length && data.downloadUrl) {
      items = [
        {
          id: bundleId,
          title: data.productBoxTitle || data.bundleTitle || "Bundle",
          fileUrl: data.downloadUrl,
          thumbnailUrl: data.productBoxThumbnail || data.thumbnailUrl || "",
          fileSize: data.fileSize || 0,
          duration: data.duration || 0,
          contentType: data.fileType?.includes("video")
            ? "video"
            : data.fileType?.includes("audio")
              ? "audio"
              : data.fileType?.includes("image")
                ? "image"
                : "document",
          mimeType: data.fileType || "application/octet-stream",
          filename: `${data.productBoxTitle || data.bundleTitle || "bundle"}.${getFileExtension(data.fileType)}`,
          displayTitle: data.productBoxTitle || data.bundleTitle || "Bundle",
          displaySize: formatFileSize(data.fileSize || 0),
          displayDuration: data.duration ? formatDuration(data.duration) : undefined,
        },
      ]
    }

    // Ensure all items have required fields
    items = items.map((item: any) => ({
      id: item.id || bundleId,
      title: item.title || item.displayTitle || "Untitled",
      fileUrl: item.fileUrl || item.downloadUrl || "",
      thumbnailUrl: item.thumbnailUrl || "",
      fileSize: item.fileSize || 0,
      duration: item.duration || 0,
      contentType: item.contentType || "document",
      mimeType: item.mimeType || "application/octet-stream",
      filename: item.filename || `${item.title || "file"}.file`,
      displayTitle: item.displayTitle || item.title || "Untitled",
      displaySize: item.displaySize || formatFileSize(item.fileSize || 0),
      displayDuration: item.displayDuration || (item.duration ? formatDuration(item.duration) : undefined),
    }))

    const purchase = {
      id: data.sessionId || id,
      sessionId: data.sessionId || id,
      bundleId: data.bundleId || null,
      productBoxId: data.productBoxId || bundleId,
      itemId: bundleId,
      productBoxTitle: data.productBoxTitle || data.bundleTitle || "Untitled Purchase",
      productBoxDescription: data.productBoxDescription || data.description || "",
      productBoxThumbnail: data.productBoxThumbnail || data.thumbnailUrl || "",
      creatorId: data.creatorId || "",
      creatorName: data.creatorName || "Unknown Creator",
      creatorUsername: data.creatorUsername || "",
      buyerUid: data.buyerUid || data.userId || "",
      userId: data.userId || data.buyerUid || "",
      userEmail: data.userEmail || data.customerEmail || "",
      userName: data.userName || "User",
      isAuthenticated: data.isAuthenticated !== false,
      purchasedAt: data.purchasedAt || data.purchaseDate || data.createdAt || new Date(),
      amount: data.amount || 0,
      currency: data.currency || "usd",
      items: items,
      itemNames: items.map((item: any) => item.displayTitle),
      contentTitles: items.map((item: any) => item.displayTitle),
      totalItems: items.length,
      totalSize: items.reduce((sum: number, item: any) => sum + (item.fileSize || 0), 0),
      source: source,
    }

    console.log(`✅ [Normalize] Normalized purchase from ${source}:`, {
      id: purchase.id,
      title: purchase.productBoxTitle,
      itemsCount: purchase.totalItems,
      hasValidItems: purchase.items.every((item: any) => !!item.fileUrl),
    })

    return purchase
  } catch (error) {
    console.error(`❌ [Normalize] Error normalizing purchase ${id} from ${source}:`, error)
    return null
  }
}

// Enhance purchase data with bundle information
async function enhancePurchaseWithBundleData(purchaseData: any, db: any): Promise<any> {
  try {
    const bundleId = purchaseData.bundleId || purchaseData.productBoxId
    if (!bundleId) {
      return purchaseData
    }

    console.log("🔄 [Enhance] Fetching bundle data for:", bundleId)

    // Try bundles collection first
    let bundleDoc = await db.collection("bundles").doc(bundleId).get()
    let bundleData = null
    let collection = "bundles"

    if (bundleDoc.exists) {
      bundleData = bundleDoc.data()
    } else {
      // Try productBoxes collection
      bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
      if (bundleDoc.exists) {
        bundleData = bundleDoc.data()
        collection = "productBoxes"
      }
    }

    if (!bundleData) {
      console.warn("⚠️ [Enhance] Bundle not found:", bundleId)
      return purchaseData
    }

    console.log(`✅ [Enhance] Found bundle in ${collection}:`, {
      title: bundleData.title,
      hasDownloadUrl: !!(bundleData.downloadUrl || bundleData.fileUrl),
      fileSize: bundleData.fileSize,
    })

    // Enhance purchase data with bundle information
    const enhancedData = {
      ...purchaseData,
      productBoxTitle: bundleData.title || purchaseData.productBoxTitle,
      bundleTitle: bundleData.title || purchaseData.bundleTitle,
      productBoxDescription: bundleData.description || purchaseData.productBoxDescription,
      productBoxThumbnail: bundleData.thumbnailUrl || purchaseData.productBoxThumbnail,
      downloadUrl: bundleData.downloadUrl || bundleData.fileUrl || purchaseData.downloadUrl,
      fileSize: bundleData.fileSize || purchaseData.fileSize,
      duration: bundleData.duration || purchaseData.duration,
      fileType: bundleData.fileType || purchaseData.fileType,
      tags: bundleData.tags || purchaseData.tags,
    }

    // Create items array if not present
    if (!enhancedData.items?.length && !enhancedData.contents?.length) {
      enhancedData.items = [
        {
          id: bundleId,
          title: bundleData.title || "Bundle",
          fileUrl: bundleData.downloadUrl || bundleData.fileUrl || "",
          thumbnailUrl: bundleData.thumbnailUrl || "",
          fileSize: bundleData.fileSize || 0,
          duration: bundleData.duration || 0,
          contentType: bundleData.fileType?.includes("video")
            ? "video"
            : bundleData.fileType?.includes("audio")
              ? "audio"
              : bundleData.fileType?.includes("image")
                ? "image"
                : "document",
          mimeType: bundleData.fileType || "application/octet-stream",
          filename: `${bundleData.title || "bundle"}.${getFileExtension(bundleData.fileType)}`,
          displayTitle: bundleData.title || "Bundle",
          displaySize: formatFileSize(bundleData.fileSize || 0),
          displayDuration: bundleData.duration ? formatDuration(bundleData.duration) : undefined,
        },
      ]
    }

    console.log("✅ [Enhance] Enhanced purchase data with bundle info")
    return enhancedData
  } catch (error) {
    console.error("❌ [Enhance] Error enhancing purchase data:", error)
    return purchaseData
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
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

function getFileExtension(mimeType: string): string {
  const extensions: { [key: string]: string } = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/pdf": "pdf",
  }
  return extensions[mimeType] || "file"
}
