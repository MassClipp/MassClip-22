import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get("authorization")
    let authenticatedUserId: string | null = null

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      try {
        const decodedToken = await auth.verifyIdToken(token)
        authenticatedUserId = decodedToken.uid
      } catch (error) {
        console.error("❌ [Migration] Auth error:", error)
        return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
      }
    }

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get product box ID from request body
    const body = await request.json()
    const productBoxId = body.productBoxId

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    console.log(`🔄 [Migration] Starting migration for user ${authenticatedUserId} and product box ${productBoxId}`)

    // Find the legacy purchase for this product box (case-insensitive)
    const legacyPurchasesRef = db.collection("users").doc(authenticatedUserId).collection("purchases")
    const legacySnapshot = await legacyPurchasesRef.get()

    let matchingPurchase = null
    let purchaseId = null

    // Search through all purchases to find a match (case-insensitive)
    for (const doc of legacySnapshot.docs) {
      const data = doc.data()
      const docProductBoxId = data.productBoxId || data.itemId || ""

      if (docProductBoxId.toLowerCase() === productBoxId.toLowerCase()) {
        matchingPurchase = data
        purchaseId = doc.id
        console.log(`✅ [Migration] Found matching purchase: ${purchaseId}`)
        break
      }
    }

    if (!matchingPurchase) {
      return NextResponse.json({ error: "No legacy purchase found for this product box" }, { status: 404 })
    }

    // Check if already migrated
    const unifiedPurchasesRef = db.collection("userPurchases").doc(authenticatedUserId).collection("purchases")
    const existingDoc = await unifiedPurchasesRef.doc(matchingPurchase.sessionId || purchaseId).get()

    if (existingDoc.exists) {
      return NextResponse.json({
        success: true,
        message: "Purchase already migrated",
        purchaseId: matchingPurchase.sessionId || purchaseId,
      })
    }

    // Get product box details (case-insensitive search)
    const productBoxesSnapshot = await db.collection("productBoxes").get()
    let productBoxData = null

    for (const doc of productBoxesSnapshot.docs) {
      if (doc.id.toLowerCase() === productBoxId.toLowerCase()) {
        productBoxData = doc.data()
        break
      }
    }

    if (!productBoxData) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    // Get creator details
    const creatorId = productBoxData.creatorId || matchingPurchase.creatorId
    let creatorData: any = { displayName: "Unknown Creator", username: "" }

    if (creatorId) {
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      if (creatorDoc.exists) {
        creatorData = creatorDoc.data()!
      }
    }

    // Get content items
    const contentItems = await fetchContentItems(productBoxId)
    console.log(`📦 [Migration] Found ${contentItems.length} content items for ${productBoxId}`)

    // Create unified purchase document
    const unifiedPurchase = {
      id: matchingPurchase.sessionId || purchaseId,
      productBoxId: productBoxId, // Use original casing
      itemId: productBoxId, // Compatibility field
      productBoxTitle: productBoxData.title || matchingPurchase.itemTitle || "Untitled Product Box",
      productBoxDescription: productBoxData.description || "",
      productBoxThumbnail: productBoxData.thumbnailUrl || productBoxData.customPreviewThumbnail || "",
      creatorId: creatorId || "",
      creatorName: creatorData.displayName || creatorData.name || "Unknown Creator",
      creatorUsername: creatorData.username || "",
      purchasedAt: matchingPurchase.createdAt || matchingPurchase.timestamp || new Date(),
      amount: matchingPurchase.amount || 0,
      currency: matchingPurchase.currency || "usd",
      sessionId: matchingPurchase.sessionId || purchaseId,
      items: contentItems,
      totalItems: contentItems.length,
      totalSize: contentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0),
    }

    // Save to userPurchases collection
    await unifiedPurchasesRef.doc(matchingPurchase.sessionId || purchaseId).set(unifiedPurchase)

    console.log(`✅ [Migration] Migrated purchase ${purchaseId} for product box ${productBoxId}`)

    return NextResponse.json({
      success: true,
      message: "Purchase migrated successfully",
      purchaseId: matchingPurchase.sessionId || purchaseId,
      contentItems: contentItems.length,
    })
  } catch (error) {
    console.error("❌ [Migration] Migration failed:", error)
    return NextResponse.json(
      {
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Helper function to fetch content items (case-insensitive)
async function fetchContentItems(productBoxId: string) {
  const items = []

  try {
    // Try productBoxContent collection first (case-insensitive)
    const contentSnapshot = await db.collection("productBoxContent").get()

    for (const doc of contentSnapshot.docs) {
      const data = doc.data()
      const docProductBoxId = data.productBoxId || data.boxId || ""

      if (docProductBoxId.toLowerCase() === productBoxId.toLowerCase()) {
        const item = normalizeContentItem(doc.id, data)
        if (item) items.push(item)
      }
    }

    console.log(`📊 [Content Fetch] Found ${items.length} items in productBoxContent`)

    // If no items found, try uploads collection
    if (items.length === 0) {
      const uploadsSnapshot = await db.collection("uploads").get()

      for (const doc of uploadsSnapshot.docs) {
        const data = doc.data()
        const docProductBoxId = data.productBoxId || ""

        if (docProductBoxId.toLowerCase() === productBoxId.toLowerCase()) {
          const item = normalizeContentItem(doc.id, data)
          if (item) items.push(item)
        }
      }

      console.log(`📊 [Content Fetch] Found ${items.length} items in uploads`)
    }

    // If still no items, check product box contentItems array
    if (items.length === 0) {
      const productBoxesSnapshot = await db.collection("productBoxes").get()

      for (const doc of productBoxesSnapshot.docs) {
        if (doc.id.toLowerCase() === productBoxId.toLowerCase()) {
          const productBoxData = doc.data()
          const contentItemIds = productBoxData.contentItems || []

          console.log(`📊 [Content Fetch] Product box has ${contentItemIds.length} content item IDs`)

          for (const itemId of contentItemIds) {
            try {
              const uploadDoc = await db.collection("uploads").doc(itemId).get()
              if (uploadDoc.exists) {
                const data = uploadDoc.data()!
                const item = normalizeContentItem(itemId, data)
                if (item) items.push(item)
              }
            } catch (error) {
              console.warn(`⚠️ [Content Fetch] Error fetching upload ${itemId}:`, error)
            }
          }
          break
        }
      }
    }

    return items
  } catch (error) {
    console.error(`❌ [Content Fetch] Error fetching content items:`, error)
    return []
  }
}

// Helper function to normalize content item
function normalizeContentItem(id: string, data: any) {
  try {
    // Get the best available URL
    const fileUrl = data.fileUrl || data.publicUrl || data.downloadUrl || ""

    // Skip items without valid URLs
    if (!fileUrl || !fileUrl.startsWith("http")) {
      console.warn(`⚠️ [Content Normalize] Skipping item ${id} - no valid URL`)
      return null
    }

    // Determine content type
    const mimeType = data.mimeType || data.fileType || "application/octet-stream"
    let contentType = "document"

    if (mimeType.startsWith("video/")) contentType = "video"
    else if (mimeType.startsWith("audio/")) contentType = "audio"
    else if (mimeType.startsWith("image/")) contentType = "image"

    const item = {
      id,
      title: data.title || data.filename || data.originalFileName || "Untitled",
      fileUrl,
      mimeType,
      fileSize: data.fileSize || data.size || 0,
      thumbnailUrl: data.thumbnailUrl || "",
      contentType,
      duration: data.duration || undefined,
      filename: data.filename || data.originalFileName || `${id}.${getFileExtension(mimeType)}`,
    }

    console.log(`✅ [Content Normalize] Normalized item ${id}:`, {
      title: item.title,
      contentType: item.contentType,
    })

    return item
  } catch (error) {
    console.error(`❌ [Content Normalize] Error normalizing item ${id}:`, error)
    return null
  }
}

// Helper function to get file extension
function getFileExtension(mimeType: string) {
  const extensions = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/pdf": "pdf",
  }
  return extensions[mimeType as keyof typeof extensions] || "file"
}
