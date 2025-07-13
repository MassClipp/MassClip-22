import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid
    const productBoxId = params.id

    console.log(`🔍 [Content API] Fetching content for product box: ${productBoxId}, user: ${userId}`)

    // First, verify user has access to this content
    let hasAccess = false
    let purchaseRecord = null

    // Check bundlePurchases first (contains full content data)
    const bundlePurchaseQuery = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", userId)
      .where("bundleId", "==", productBoxId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    if (!bundlePurchaseQuery.empty) {
      hasAccess = true
      purchaseRecord = bundlePurchaseQuery.docs[0].data()
      console.log(`✅ [Content API] Access verified via bundlePurchases`)

      // If purchase record has contents, return them directly
      if (purchaseRecord.contents && Array.isArray(purchaseRecord.contents)) {
        console.log(`✅ [Content API] Returning ${purchaseRecord.contents.length} items from purchase record`)

        const formattedItems = purchaseRecord.contents.map((item: any) => ({
          id: item.id || item.contentId,
          title: item.title || item.filename || "Untitled",
          displayTitle: item.title || item.filename || "Untitled",
          fileUrl: item.fileUrl || item.downloadUrl || item.url,
          mimeType: item.mimeType || item.contentType || "application/octet-stream",
          fileSize: item.fileSize || 0,
          displaySize: formatFileSize(item.fileSize || 0),
          thumbnailUrl: item.thumbnailUrl || item.previewUrl,
          contentType: getContentType(item.mimeType || item.contentType || ""),
          duration: item.duration,
          displayDuration: item.duration ? formatDuration(item.duration) : undefined,
          filename: item.filename || item.title || "download",
          description: item.description || "",
          displayResolution: item.resolution || item.dimensions,
        }))

        return NextResponse.json({
          success: true,
          items: formattedItems,
          totalItems: formattedItems.length,
          source: "bundlePurchases",
        })
      }
    }

    // Check productBoxPurchases as fallback
    if (!hasAccess) {
      const productBoxPurchaseQuery = await db
        .collection("productBoxPurchases")
        .where("buyerUid", "==", userId)
        .where("productBoxId", "==", productBoxId)
        .where("status", "==", "completed")
        .limit(1)
        .get()

      if (!productBoxPurchaseQuery.empty) {
        hasAccess = true
        console.log(`✅ [Content API] Access verified via productBoxPurchases`)
      }
    }

    // Check unifiedPurchases as final fallback
    if (!hasAccess) {
      const unifiedPurchaseQuery = await db
        .collection("unifiedPurchases")
        .where("userId", "==", userId)
        .where("productBoxId", "==", productBoxId)
        .where("status", "==", "completed")
        .limit(1)
        .get()

      if (!unifiedPurchaseQuery.empty) {
        hasAccess = true
        const unifiedData = unifiedPurchaseQuery.docs[0].data()

        // If unified purchase has items, return them
        if (unifiedData.items && Array.isArray(unifiedData.items)) {
          console.log(`✅ [Content API] Returning ${unifiedData.items.length} items from unified purchase`)
          return NextResponse.json({
            success: true,
            items: unifiedData.items,
            totalItems: unifiedData.items.length,
            source: "unifiedPurchases",
          })
        }

        console.log(`✅ [Content API] Access verified via unifiedPurchases`)
      }
    }

    if (!hasAccess) {
      console.log(`❌ [Content API] Access denied for user ${userId} to product box ${productBoxId}`)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // If we have access but no content in purchase records, fetch from productBoxContent
    console.log(`🔍 [Content API] Fetching content from productBoxContent collection...`)

    const contentQuery = await db.collection("productBoxContent").where("productBoxId", "==", productBoxId).get()

    const contentItems = contentQuery.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || data.filename || "Untitled",
        displayTitle: data.title || data.filename || "Untitled",
        fileUrl: data.fileUrl || data.downloadUrl || data.url,
        mimeType: data.mimeType || data.contentType || "application/octet-stream",
        fileSize: data.fileSize || 0,
        displaySize: formatFileSize(data.fileSize || 0),
        thumbnailUrl: data.thumbnailUrl || data.previewUrl,
        contentType: getContentType(data.mimeType || data.contentType || ""),
        duration: data.duration,
        displayDuration: data.duration ? formatDuration(data.duration) : undefined,
        filename: data.filename || data.title || "download",
        description: data.description || "",
        displayResolution: data.resolution || data.dimensions,
      }
    })

    console.log(`✅ [Content API] Found ${contentItems.length} content items`)

    return NextResponse.json({
      success: true,
      items: contentItems,
      totalItems: contentItems.length,
      source: "productBoxContent",
    })
  } catch (error: any) {
    console.error(`❌ [Content API] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch content",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

function getContentType(mimeType: string): "video" | "audio" | "image" | "document" {
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}
