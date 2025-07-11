import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, productBoxId, creatorId } = await request.json()

    console.log(`🔍 [Verify & Grant] Processing request:`, {
      sessionId,
      productBoxId,
      creatorId,
    })

    if (!sessionId && !productBoxId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // First, try to find existing purchase by session ID
    let buyerUid = null

    if (sessionId) {
      try {
        // Look for existing purchase in main purchases collection
        const purchaseDoc = await db.collection("purchases").doc(sessionId).get()
        if (purchaseDoc.exists) {
          const data = purchaseDoc.data()!
          buyerUid = data.buyerUid || data.userId
          console.log(`✅ [Verify & Grant] Found existing purchase for session ${sessionId}, buyer: ${buyerUid}`)
        }
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Could not find purchase by session ID:`, error)
      }
    }

    // If no session-based purchase found, create anonymous purchase record
    if (!buyerUid) {
      // Generate anonymous user ID for this purchase
      buyerUid = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log(`🔄 [Verify & Grant] Creating anonymous purchase for user: ${buyerUid}`)
    }

    // Try to get product details from both collections
    let productData = null
    let productCollection = null

    // First try bundles collection
    try {
      const bundleDoc = await db.collection("bundles").doc(productBoxId).get()
      if (bundleDoc.exists) {
        productData = bundleDoc.data()!
        productCollection = "bundles"
        console.log(`✅ [Verify & Grant] Found product in bundles collection`)
      }
    } catch (error) {
      console.warn(`⚠️ [Verify & Grant] Could not find in bundles collection:`, error)
    }

    // If not found in bundles, try productBoxes collection
    if (!productData) {
      try {
        const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
        if (productBoxDoc.exists) {
          productData = productBoxDoc.data()!
          productCollection = "productBoxes"
          console.log(`✅ [Verify & Grant] Found product in productBoxes collection`)
        }
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Could not find in productBoxes collection:`, error)
      }
    }

    // If still not found, return error
    if (!productData) {
      console.error(`❌ [Verify & Grant] Product not found in any collection for ID: ${productBoxId}`)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    console.log(`📦 [Verify & Grant] Product found in ${productCollection}:`, {
      title: productData.title,
      price: productData.price,
      creatorId: productData.creatorId,
    })

    // Get creator details
    const actualCreatorId = creatorId || productData.creatorId
    let creatorData = null
    if (actualCreatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(actualCreatorId).get()
        creatorData = creatorDoc.exists ? creatorDoc.data() : null
        console.log(`👤 [Verify & Grant] Creator found:`, {
          name: creatorData?.displayName || creatorData?.name,
          username: creatorData?.username,
        })
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Could not find creator:`, error)
      }
    }

    // Create unified purchase record (this fetches all content items)
    const purchaseId = sessionId || `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      await UnifiedPurchaseService.createUnifiedPurchase(buyerUid, {
        productBoxId,
        sessionId: purchaseId,
        amount: productData.price || 0,
        currency: "usd",
        creatorId: actualCreatorId || "",
      })
      console.log(`✅ [Verify & Grant] Unified purchase created successfully`)
    } catch (error) {
      console.error(`❌ [Verify & Grant] Failed to create unified purchase:`, error)
      // Continue anyway - we'll create a basic purchase record
    }

    // Get the created purchase for response (with fallback)
    let createdPurchase = null
    try {
      createdPurchase = await UnifiedPurchaseService.getUserPurchase(buyerUid, purchaseId)
    } catch (error) {
      console.warn(`⚠️ [Verify & Grant] Could not get unified purchase, using fallback`)
    }

    // Get content items directly if unified purchase failed
    let contentItems = []
    let totalItems = 0
    let totalSize = 0

    if (!createdPurchase) {
      try {
        // Try to get content from the product's content subcollection
        const contentSnapshot = await db.collection(productCollection!).doc(productBoxId).collection("content").get()

        contentItems = contentSnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.title || data.name || "Untitled",
            fileUrl: data.fileUrl || data.url || "",
            thumbnailUrl: data.thumbnailUrl || "",
            fileSize: data.fileSize || 0,
            duration: data.duration || 0,
            contentType: data.contentType || data.type || "video",
          }
        })

        totalItems = contentItems.length
        totalSize = contentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0)

        console.log(`📁 [Verify & Grant] Found ${totalItems} content items directly`)
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Could not fetch content items:`, error)
      }
    } else {
      contentItems = createdPurchase.items || []
      totalItems = createdPurchase.totalItems || 0
      totalSize = createdPurchase.totalSize || 0
    }

    // Create main purchase record for API compatibility
    const mainPurchaseData = {
      userId: buyerUid,
      buyerUid,
      productBoxId,
      itemId: productBoxId,
      sessionId: purchaseId,
      amount: productData.price || 0,
      currency: "usd",
      timestamp: new Date(),
      createdAt: new Date(),
      purchasedAt: new Date(),
      status: "completed",
      type: productCollection === "bundles" ? "bundle" : "product_box",
      itemTitle: productData.title || "Untitled Product",
      itemDescription: productData.description || "",
      thumbnailUrl: productData.thumbnailUrl || "",
      customPreviewThumbnail: productData.customPreviewThumbnail || "",
      creatorId: actualCreatorId,
      creatorName: creatorData?.displayName || creatorData?.name || "",
      creatorUsername: creatorData?.username || "",
      accessUrl: `/product-box/${productBoxId}/content`,
      verificationMethod: "direct_grant",
      grantedAt: new Date(),
      isAnonymous: !sessionId, // Mark if this is an anonymous purchase
      sourceCollection: productCollection, // Track which collection this came from
    }

    // Write to main purchases collection
    await db.collection("purchases").doc(purchaseId).set(mainPurchaseData)
    console.log(`✅ [Verify & Grant] Main purchase record created`)

    // Update product sales counter in the correct collection
    try {
      await db
        .collection(productCollection!)
        .doc(productBoxId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(productData.price || 0),
          lastPurchaseAt: new Date(),
        })
      console.log(`✅ [Verify & Grant] Updated sales counter in ${productCollection}`)
    } catch (error) {
      console.warn(`⚠️ [Verify & Grant] Could not update sales counter:`, error)
    }

    // Record the sale for the creator
    if (actualCreatorId) {
      try {
        await db
          .collection("users")
          .doc(actualCreatorId)
          .collection("sales")
          .add({
            productBoxId,
            buyerUid,
            sessionId: purchaseId,
            amount: productData.price || 0,
            platformFee: (productData.price || 0) * 0.25,
            netAmount: (productData.price || 0) * 0.75,
            purchasedAt: new Date(),
            status: "completed",
            productTitle: productData.title || "Untitled Product",
            verificationMethod: "direct_grant",
            isAnonymous: !sessionId,
            sourceCollection: productCollection,
          })

        // Increment the creator's total sales
        await db
          .collection("users")
          .doc(actualCreatorId)
          .update({
            totalSales: db.FieldValue.increment(1),
            totalRevenue: db.FieldValue.increment(productData.price || 0),
            lastSaleAt: new Date(),
          })

        console.log(`✅ [Verify & Grant] Creator sales recorded`)
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Could not record creator sales:`, error)
      }
    }

    console.log(`✅ [Verify & Grant] Successfully granted access for purchase: ${purchaseId}`)

    // Return comprehensive purchase data
    const responseData = {
      purchase: {
        id: purchaseId,
        productBoxId,
        productBoxTitle: productData.title || "Untitled Product",
        productBoxDescription: productData.description || "",
        productBoxThumbnail: productData.thumbnailUrl || productData.customPreviewThumbnail || "",
        creatorId: actualCreatorId,
        creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
        creatorUsername: creatorData?.username || "",
        amount: productData.price || 0,
        currency: "usd",
        items: contentItems,
        totalItems,
        totalSize,
        purchasedAt: new Date().toISOString(),
        sourceCollection: productCollection,
      },
      accessGranted: true,
      message: "Access granted successfully",
    }

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error(`❌ [Verify & Grant] Error:`, error)
    return NextResponse.json(
      {
        error: error.message || "Failed to verify purchase and grant access",
        details: error.stack,
      },
      { status: 500 },
    )
  }
}
