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
    const purchaseData = null
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

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }
    const productBoxData = productBoxDoc.data()!

    // Get creator details
    const actualCreatorId = creatorId || productBoxData.creatorId
    let creatorData = null
    if (actualCreatorId) {
      const creatorDoc = await db.collection("users").doc(actualCreatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Create unified purchase record (this fetches all content items)
    const purchaseId = sessionId || `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await UnifiedPurchaseService.createUnifiedPurchase(buyerUid, {
      productBoxId,
      sessionId: purchaseId,
      amount: productBoxData.price || 0,
      currency: "usd",
      creatorId: actualCreatorId || "",
    })

    // Get the created purchase for response
    const createdPurchase = await UnifiedPurchaseService.getUserPurchase(buyerUid, purchaseId)

    if (!createdPurchase) {
      throw new Error("Failed to create purchase record")
    }

    // Also create main purchase record for API compatibility
    const mainPurchaseData = {
      userId: buyerUid,
      buyerUid,
      productBoxId,
      itemId: productBoxId,
      sessionId: purchaseId,
      amount: productBoxData.price || 0,
      currency: "usd",
      timestamp: new Date(),
      createdAt: new Date(),
      purchasedAt: new Date(),
      status: "completed",
      type: "product_box",
      itemTitle: productBoxData.title || "Untitled Product Box",
      itemDescription: productBoxData.description || "",
      thumbnailUrl: productBoxData.thumbnailUrl || "",
      customPreviewThumbnail: productBoxData.customPreviewThumbnail || "",
      creatorId: actualCreatorId,
      creatorName: creatorData?.displayName || creatorData?.name || "",
      creatorUsername: creatorData?.username || "",
      accessUrl: `/product-box/${productBoxId}/content`,
      verificationMethod: "direct_grant",
      grantedAt: new Date(),
      isAnonymous: !sessionId, // Mark if this is an anonymous purchase
    }

    // Write to main purchases collection
    await db.collection("purchases").doc(purchaseId).set(mainPurchaseData)

    // Update product box sales counter
    await db
      .collection("productBoxes")
      .doc(productBoxId)
      .update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(productBoxData.price || 0),
        lastPurchaseAt: new Date(),
      })

    // Record the sale for the creator
    if (actualCreatorId) {
      await db
        .collection("users")
        .doc(actualCreatorId)
        .collection("sales")
        .add({
          productBoxId,
          buyerUid,
          sessionId: purchaseId,
          amount: productBoxData.price || 0,
          platformFee: (productBoxData.price || 0) * 0.25,
          netAmount: (productBoxData.price || 0) * 0.75,
          purchasedAt: new Date(),
          status: "completed",
          productTitle: productBoxData.title || "Untitled Product Box",
          verificationMethod: "direct_grant",
          isAnonymous: !sessionId,
        })

      // Increment the creator's total sales
      await db
        .collection("users")
        .doc(actualCreatorId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(productBoxData.price || 0),
          lastSaleAt: new Date(),
        })
    }

    console.log(`✅ [Verify & Grant] Successfully granted access for purchase: ${purchaseId}`)

    // Return comprehensive purchase data
    const responseData = {
      purchase: {
        id: purchaseId,
        productBoxId,
        productBoxTitle: productBoxData.title || "Untitled Product Box",
        productBoxDescription: productBoxData.description || "",
        productBoxThumbnail: productBoxData.thumbnailUrl || productBoxData.customPreviewThumbnail || "",
        creatorId: actualCreatorId,
        creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
        creatorUsername: creatorData?.username || "",
        amount: productBoxData.price || 0,
        currency: "usd",
        items: createdPurchase.items || [],
        totalItems: createdPurchase.totalItems || 0,
        totalSize: createdPurchase.totalSize || 0,
        purchasedAt: new Date().toISOString(),
      },
      accessGranted: true,
      message: "Access granted successfully",
    }

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error(`❌ [Verify & Grant] Error:`, error)
    return NextResponse.json({ error: error.message || "Failed to verify purchase and grant access" }, { status: 500 })
  }
}
