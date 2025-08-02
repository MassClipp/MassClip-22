import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  try {
    const { userId, productBoxId, sessionId } = await request.json()

    console.log("🔍 [Access Check] Checking product box access with buyer identification:", {
      userId,
      productBoxId,
      sessionId,
    })

    // CRITICAL: Validate buyer identification
    if (!userId) {
      console.error("❌ [Access Check] Missing buyer identification (userId)")
      return NextResponse.json({ error: "Buyer identification required" }, { status: 400 })
    }

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID required" }, { status: 400 })
    }

    // Method 1: Check unified purchase service first
    if (sessionId) {
      const unifiedPurchase = await UnifiedPurchaseService.getUserPurchase(userId, sessionId)
      if (unifiedPurchase) {
        console.log("✅ [Access Check] Access granted via unified purchase service")
        return NextResponse.json({
          hasAccess: true,
          purchase: unifiedPurchase,
          accessMethod: "unified_purchase_service",
        })
      }
    }

    // Method 2: Check if user has purchased this specific product box
    const hasPurchased = await UnifiedPurchaseService.hasUserPurchased(userId, productBoxId)
    if (hasPurchased) {
      console.log("✅ [Access Check] Access granted via product box purchase check")
      return NextResponse.json({
        hasAccess: true,
        accessMethod: "product_box_purchase_check",
      })
    }

    // Method 3: Check main purchases collection with buyer UID verification
    const purchasesQuery = await db
      .collection("purchases")
      .where("buyerUid", "==", userId)
      .where("productBoxId", "==", productBoxId)
      .where("status", "==", "completed")
      .get()

    if (!purchasesQuery.empty) {
      const purchase = purchasesQuery.docs[0].data()
      console.log("✅ [Access Check] Access granted via main purchases collection:", {
        buyerUid: purchase.buyerUid,
        productBoxId: purchase.productBoxId,
        sessionId: purchase.sessionId,
      })
      return NextResponse.json({
        hasAccess: true,
        purchase,
        accessMethod: "main_purchases_collection",
      })
    }

    // Method 4: Check user's personal purchases collection
    if (userId !== "anonymous" && !userId.startsWith("anonymous_")) {
      const userPurchasesQuery = await db
        .collection("users")
        .doc(userId)
        .collection("purchases")
        .where("productBoxId", "==", productBoxId)
        .where("status", "==", "completed")
        .get()

      if (!userPurchasesQuery.empty) {
        const purchase = userPurchasesQuery.docs[0].data()
        console.log("✅ [Access Check] Access granted via user purchases collection")
        return NextResponse.json({
          hasAccess: true,
          purchase,
          accessMethod: "user_purchases_collection",
        })
      }
    }

    // Method 5: Check bundlePurchases collection (for backward compatibility)
    const bundlePurchasesQuery = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", userId)
      .where("productBoxId", "==", productBoxId)
      .get()

    if (!bundlePurchasesQuery.empty) {
      const purchase = bundlePurchasesQuery.docs[0].data()
      console.log("✅ [Access Check] Access granted via bundle purchases collection")
      return NextResponse.json({
        hasAccess: true,
        purchase,
        accessMethod: "bundle_purchases_collection",
      })
    }

    // Method 6: Check by session ID if provided
    if (sessionId) {
      // Check main purchases by session ID
      const sessionPurchaseDoc = await db.collection("purchases").doc(sessionId).get()
      if (sessionPurchaseDoc.exists) {
        const purchase = sessionPurchaseDoc.data()!

        // Verify the buyer UID matches
        if (purchase.buyerUid === userId && purchase.productBoxId === productBoxId) {
          console.log("✅ [Access Check] Access granted via session ID lookup with buyer verification")
          return NextResponse.json({
            hasAccess: true,
            purchase,
            accessMethod: "session_id_lookup_verified",
          })
        } else {
          console.warn("⚠️ [Access Check] Session found but buyer UID mismatch:", {
            sessionBuyerUid: purchase.buyerUid,
            requestBuyerUid: userId,
          })
        }
      }

      // Check bundlePurchases by session ID
      const bundleSessionDoc = await db.collection("bundlePurchases").doc(sessionId).get()
      if (bundleSessionDoc.exists) {
        const purchase = bundleSessionDoc.data()!

        // Verify the buyer UID matches
        if (
          purchase.buyerUid === userId &&
          (purchase.productBoxId === productBoxId || purchase.bundleId === productBoxId)
        ) {
          console.log("✅ [Access Check] Access granted via bundle session ID lookup with buyer verification")
          return NextResponse.json({
            hasAccess: true,
            purchase,
            accessMethod: "bundle_session_id_lookup_verified",
          })
        }
      }
    }

    // Method 7: Check anonymous purchases if applicable
    if (userId.startsWith("anonymous_")) {
      const anonymousPurchasesQuery = await db
        .collection("anonymousPurchases")
        .where("buyerUid", "==", userId)
        .where("productBoxId", "==", productBoxId)
        .get()

      if (!anonymousPurchasesQuery.empty) {
        const purchase = anonymousPurchasesQuery.docs[0].data()
        console.log("✅ [Access Check] Access granted via anonymous purchases collection")
        return NextResponse.json({
          hasAccess: true,
          purchase,
          accessMethod: "anonymous_purchases_collection",
        })
      }
    }

    console.log("❌ [Access Check] No access found for user:", { userId, productBoxId, sessionId })
    return NextResponse.json({
      hasAccess: false,
      message: "No purchase found for this user and product",
      checkedMethods: [
        "unified_purchase_service",
        "product_box_purchase_check",
        "main_purchases_collection",
        "user_purchases_collection",
        "bundle_purchases_collection",
        "session_id_lookup",
        "anonymous_purchases_collection",
      ],
    })
  } catch (error) {
    console.error("❌ [Access Check] Error checking product box access:", error)
    return NextResponse.json({ error: "Failed to check access" }, { status: 500 })
  }
}
