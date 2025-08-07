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

    console.log("🔄 [Migration] Starting migration for user:", authenticatedUserId)

    // Get all legacy purchases for this user
    const userRef = db.collection("users").doc(authenticatedUserId)
    const purchasesRef = userRef.collection("purchases")
    const legacyPurchasesSnapshot = await purchasesRef.get()

    const migrationResults = {
      total: legacyPurchasesSnapshot.size,
      migrated: 0,
      skipped: 0,
      errors: 0,
      details: [] as string[],
    }

    console.log(`📊 [Migration] Found ${legacyPurchasesSnapshot.size} legacy purchases`)

    // Process each purchase
    for (const purchaseDoc of legacyPurchasesSnapshot.docs) {
      try {
        const purchaseData = purchaseDoc.data()
        const purchaseId = purchaseDoc.id

        console.log(`🔍 [Migration] Processing purchase ${purchaseId}:`, {
          type: purchaseData.type,
          productBoxId: purchaseData.productBoxId,
        })

        // Skip if not a product box purchase
        if (purchaseData.type !== "product_box" || !purchaseData.productBoxId) {
          console.log(`⏭️ [Migration] Skipping non-product box purchase:`, purchaseId)
          migrationResults.skipped++
          migrationResults.details.push(`Skipped ${purchaseId}: Not a product box purchase`)
          continue
        }

        // Check if already migrated
        const unifiedPurchasesRef = db.collection("userPurchases").doc(authenticatedUserId).collection("purchases")
        const existingDoc = await unifiedPurchasesRef.doc(purchaseData.sessionId || purchaseId).get()

        if (existingDoc.exists) {
          console.log(`⏭️ [Migration] Already migrated:`, purchaseId)
          migrationResults.skipped++
          migrationResults.details.push(`Skipped ${purchaseId}: Already migrated`)
          continue
        }

        // Get product box details
        const productBoxRef = db.collection("productBoxes").doc(purchaseData.productBoxId)
        const productBoxDoc = await productBoxRef.get()

        if (!productBoxDoc.exists) {
          console.log(`⚠️ [Migration] Product box not found:`, purchaseData.productBoxId)
          migrationResults.errors++
          migrationResults.details.push(`Error ${purchaseId}: Product box not found`)
          continue
        }

        const productBoxData = productBoxDoc.data()!

        // Get creator details
        const creatorId = productBoxData.creatorId || purchaseData.creatorId
        let creatorData: any = { displayName: "Unknown Creator", username: "" }

        if (creatorId) {
          const creatorDoc = await db.collection("users").doc(creatorId).get()
          if (creatorDoc.exists) {
            creatorData = creatorDoc.data()!
          }
        }

        // Get content items
        const contentItems = await fetchContentItems(purchaseData.productBoxId)
        console.log(`📦 [Migration] Found ${contentItems.length} content items for ${purchaseData.productBoxId}`)

        // Create unified purchase document
        const unifiedPurchase = {
          id: purchaseData.sessionId || purchaseId,
          productBoxId: purchaseData.productBoxId,
          productBoxTitle: productBoxData.title || purchaseData.itemTitle || "Untitled Product Box",
          productBoxDescription: productBoxData.description || "",
          productBoxThumbnail: productBoxData.thumbnailUrl || productBoxData.customPreviewThumbnail || "",
          creatorId: creatorId || "",
          creatorName: creatorData.displayName || creatorData.name || "Unknown Creator",
          creatorUsername: creatorData.username || "",
          purchasedAt: purchaseData.createdAt || purchaseData.timestamp || new Date(),
          amount: purchaseData.amount || 0,
          currency: purchaseData.currency || "usd",
          sessionId: purchaseData.sessionId || purchaseId,
          items: contentItems,
          totalItems: contentItems.length,
          totalSize: contentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0),
        }

        // Save to userPurchases collection
        await unifiedPurchasesRef.doc(purchaseData.sessionId || purchaseId).set(unifiedPurchase)

        console.log(`✅ [Migration] Migrated purchase:`, purchaseId)
        migrationResults.migrated++
        migrationResults.details.push(`Migrated ${purchaseId}: ${contentItems.length} items`)
      } catch (error) {
        console.error(`❌ [Migration] Error migrating purchase ${purchaseDoc.id}:`, error)
        migrationResults.errors++
        migrationResults.details.push(
          `Error ${purchaseDoc.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      }
    }

    console.log("🎉 [Migration] Migration complete:", migrationResults)

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      results: migrationResults,
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

// Helper function to fetch content items
async function fetchContentItems(productBoxId: string) {
  const items = []

  try {
    // Try productBoxContent collection first (primary source)
    const contentSnapshot = await db.collection("productBoxContent").where("productBoxId", "==", productBoxId).get()

    console.log(`📊 [Content Fetch] productBoxContent query found ${contentSnapshot.size} items`)

    for (const doc of contentSnapshot.docs) {
      const data = doc.data()
      const item = normalizeContentItem(doc.id, data)
      if (item) items.push(item)
    }

    // If no items found, try with boxId field
    if (items.length === 0) {
      const boxIdSnapshot = await db.collection("productBoxContent").where("boxId", "==", productBoxId).get()

      console.log(`📊 [Content Fetch] boxId query found ${boxIdSnapshot.size} items`)

      for (const doc of boxIdSnapshot.docs) {
        const data = doc.data()
        const item = normalizeContentItem(doc.id, data)
        if (item) items.push(item)
      }
    }

    // If still no items, try uploads collection
    if (items.length === 0) {
      const uploadsSnapshot = await db.collection("uploads").where("productBoxId", "==", productBoxId).get()

      console.log(`📊 [Content Fetch] uploads query found ${uploadsSnapshot.size} items`)

      for (const doc of uploadsSnapshot.docs) {
        const data = doc.data()
        const item = normalizeContentItem(doc.id, data)
        if (item) items.push(item)
      }
    }

    // If still no items, check product box contentItems array
    if (items.length === 0) {
      const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      if (productBoxDoc.exists) {
        const productBoxData = productBoxDoc.data()!
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
