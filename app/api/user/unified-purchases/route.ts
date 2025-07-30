import { type NextRequest, NextResponse } from "next/server"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Unified Purchases] Fetching user purchases")

    // Get authenticated user
    const headers = Object.fromEntries(request.headers.entries())
    const user = await getAuthenticatedUser(headers)
    console.log("✅ [Unified Purchases] Authenticated user:", user.uid)

    // Get user's purchases from their subcollection (fastest lookup)
    const userPurchasesSnapshot = await adminDb
      .collection("users")
      .doc(user.uid)
      .collection("purchases")
      .where("status", "==", "completed")
      .orderBy("purchasedAt", "desc")
      .get()

    console.log("📊 [Unified Purchases] Found purchases:", userPurchasesSnapshot.size)

    if (userPurchasesSnapshot.empty) {
      return NextResponse.json({
        success: true,
        purchases: [],
        message: "No purchases found",
      })
    }

    // Get product box details for each purchase
    const purchases = []
    for (const purchaseDoc of userPurchasesSnapshot.docs) {
      const purchaseData = purchaseDoc.data()

      try {
        // Get product box details
        const productBoxDoc = await adminDb.collection("product_boxes").doc(purchaseData.productBoxId).get()

        if (productBoxDoc.exists) {
          const productBox = productBoxDoc.data()!

          purchases.push({
            purchaseId: purchaseData.purchaseId,
            productBoxId: purchaseData.productBoxId,
            purchasedAt: purchaseData.purchasedAt,
            amount: purchaseData.amount,
            currency: purchaseData.currency,
            sessionId: purchaseData.sessionId,
            status: purchaseData.status,
            productBox: {
              id: purchaseData.productBoxId,
              title: productBox.title,
              description: productBox.description,
              thumbnailUrl: productBox.thumbnailUrl,
              price: productBox.price,
              creatorId: productBox.creatorId,
              contentCount: productBox.contentItems?.length || 0,
            },
          })
        } else {
          console.warn("⚠️ [Unified Purchases] Product box not found:", purchaseData.productBoxId)
        }
      } catch (error) {
        console.error("❌ [Unified Purchases] Error fetching product box:", purchaseData.productBoxId, error)
      }
    }

    console.log("✅ [Unified Purchases] Returning purchases:", purchases.length)

    return NextResponse.json({
      success: true,
      purchases,
      count: purchases.length,
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

// POST endpoint to check access for a specific product/bundle
export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Unified Purchases] Checking access for specific item...")

    // Verify the user is authenticated
    const decodedToken = await getAuthenticatedUser(request.headers)
    if (!decodedToken) {
      console.error("❌ [Unified Purchases] Authentication required")
      return NextResponse.json({ hasAccess: false, error: "Authentication required" }, { status: 401 })
    }

    const { productBoxId, bundleId } = await request.json()
    const itemId = productBoxId || bundleId
    const userId = decodedToken.uid

    if (!itemId) {
      return NextResponse.json({ hasAccess: false, error: "Product or bundle ID required" }, { status: 400 })
    }

    console.log("🔍 [Unified Purchases] Checking access:", {
      userId,
      itemId,
      type: productBoxId ? "product_box" : "bundle",
    })

    // Check bundlePurchases collection
    let hasAccess = false
    let purchaseDetails = null

    if (bundleId) {
      const bundlePurchaseQuery = await adminDb
        .collection("bundlePurchases")
        .where("buyerUid", "==", userId)
        .where("bundleId", "==", bundleId)
        .limit(1)
        .get()

      if (!bundlePurchaseQuery.empty) {
        hasAccess = true
        purchaseDetails = bundlePurchaseQuery.docs[0].data()
        console.log("✅ [Unified Purchases] Bundle access confirmed via bundlePurchases")
      }
    }

    if (productBoxId && !hasAccess) {
      const productPurchaseQuery = await adminDb
        .collection("bundlePurchases")
        .where("buyerUid", "==", userId)
        .where("productBoxId", "==", productBoxId)
        .limit(1)
        .get()

      if (!productPurchaseQuery.empty) {
        hasAccess = true
        purchaseDetails = productPurchaseQuery.docs[0].data()
        console.log("✅ [Unified Purchases] Product box access confirmed via bundlePurchases")
      }
    }

    // Check main purchases collection as fallback
    if (!hasAccess) {
      const field = bundleId ? "bundleId" : "productBoxId"
      const mainPurchaseQuery = await adminDb
        .collection("purchases")
        .where("buyerUid", "==", userId)
        .where(field, "==", itemId)
        .limit(1)
        .get()

      if (!mainPurchaseQuery.empty) {
        hasAccess = true
        purchaseDetails = mainPurchaseQuery.docs[0].data()
        console.log("✅ [Unified Purchases] Access confirmed via main purchases collection")
      }
    }

    console.log(`${hasAccess ? "✅" : "❌"} [Unified Purchases] Access result:`, { userId, itemId, hasAccess })

    return NextResponse.json({
      hasAccess,
      purchaseDetails,
      userId,
      itemId,
      itemType: productBoxId ? "product_box" : "bundle",
    })
  } catch (error) {
    console.error("❌ [Unified Purchases] Error checking access:", error)
    return NextResponse.json(
      {
        hasAccess: false,
        error: "Failed to check access",
      },
      { status: 500 },
    )
  }
}
