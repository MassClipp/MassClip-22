import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`🔍 [User Purchases] Getting purchases for user: ${userId}`)

    const purchases: any[] = []

    // Get from bundlePurchases collection (primary source)
    const bundlePurchasesQuery = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", userId)
      .orderBy("createdAt", "desc")
      .get()

    for (const doc of bundlePurchasesQuery.docs) {
      const purchaseData = doc.data()

      // Get item details
      let itemData = null
      const itemId = purchaseData.bundleId || purchaseData.productBoxId
      const itemType = purchaseData.bundleId ? "bundles" : "productBoxes"

      if (itemId) {
        try {
          const itemDoc = await db.collection(itemType).doc(itemId).get()
          if (itemDoc.exists) {
            itemData = itemDoc.data()
          }
        } catch (error) {
          console.warn(`⚠️ [User Purchases] Could not fetch item data for: ${itemId}`)
        }
      }

      // Get creator details
      let creatorData = null
      if (purchaseData.creatorId) {
        try {
          const creatorDoc = await db.collection("users").doc(purchaseData.creatorId).get()
          if (creatorDoc.exists) {
            creatorData = creatorDoc.data()
          }
        } catch (error) {
          console.warn(`⚠️ [User Purchases] Could not fetch creator data for: ${purchaseData.creatorId}`)
        }
      }

      purchases.push({
        id: doc.id,
        ...purchaseData,
        item: itemData,
        creator: creatorData,
        purchasedAt: purchaseData.createdAt || purchaseData.purchasedAt,
      })
    }

    console.log(`✅ [User Purchases] Found ${purchases.length} purchases for user`)

    return NextResponse.json({
      success: true,
      purchases,
      total: purchases.length,
    })
  } catch (error: any) {
    console.error("❌ [User Purchases] Error fetching purchases:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch purchases",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
