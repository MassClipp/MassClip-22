import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, buyerUid, productBoxId, amount, currency } = await request.json()

    if (!sessionId || !buyerUid || !productBoxId) {
      return NextResponse.json(
        {
          error: "Missing required fields: sessionId, buyerUid, productBoxId",
        },
        { status: 400 },
      )
    }

    console.log(`🔄 [Force Complete] Processing purchase:`, { sessionId, buyerUid, productBoxId })

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    const creatorId = productBoxData.creatorId

    // Check if purchase already exists
    const existingPurchase = await UnifiedPurchaseService.getUserPurchase(buyerUid, sessionId)
    if (existingPurchase) {
      return NextResponse.json({
        message: "Purchase already exists",
        purchase: existingPurchase,
      })
    }

    // Create unified purchase
    await UnifiedPurchaseService.createUnifiedPurchase(buyerUid, {
      productBoxId,
      sessionId,
      amount: amount || productBoxData.price || 0,
      currency: currency || "usd",
      creatorId,
    })

    // Also create legacy purchase for backward compatibility
    const legacyPurchaseData = {
      productBoxId,
      sessionId,
      amount: amount || productBoxData.price || 0,
      currency: currency || "usd",
      status: "completed",
      type: "product_box",
      purchasedAt: new Date(),
      createdAt: new Date(),
      itemTitle: productBoxData.title || "Untitled Product Box",
      itemDescription: productBoxData.description || "",
      thumbnailUrl: productBoxData.thumbnailUrl || "",
      creatorId,
      accessUrl: `/product-box/${productBoxId}/content`,
    }

    // Save to user's purchases
    await db.collection("users").doc(buyerUid).collection("purchases").add(legacyPurchaseData)

    // Save to global purchases
    await db.collection("purchases").add({
      ...legacyPurchaseData,
      buyerUid,
    })

    console.log(`✅ [Force Complete] Purchase completed successfully`)

    return NextResponse.json({
      success: true,
      message: "Purchase completed successfully",
      sessionId,
      buyerUid,
      productBoxId,
    })
  } catch (error) {
    console.error("❌ [Force Complete] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to complete purchase",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
