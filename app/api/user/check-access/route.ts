import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

/**
 * READ-ONLY: Check if user has access to a product box
 * This route only checks access - it does NOT grant access or handle fulfillment
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, productBoxId, sessionId } = await request.json()

    console.log("🔍 [Check Access] READ-ONLY access check:", {
      userId,
      productBoxId,
      sessionId,
    })

    // CRITICAL: Validate buyer identification
    if (!userId) {
      console.error("❌ [Check Access] Missing buyer identification (userId)")
      return NextResponse.json({ error: "Buyer identification required" }, { status: 400 })
    }

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID required" }, { status: 400 })
    }

    // Method 1: Check unified purchase service first
    if (sessionId) {
      const unifiedPurchase = await UnifiedPurchaseService.getUserPurchase(userId, sessionId)
      if (unifiedPurchase) {
        console.log("✅ [Check Access] Access granted via unified purchase service")
        return NextResponse.json({
          hasAccess: true,
          purchase: unifiedPurchase,
          accessMethod: "unified_purchase_service",
          note: "READ-ONLY: Access check only",
        })
      }
    }

    // Method 2: Check if user has purchased this specific product box
    const hasPurchased = await UnifiedPurchaseService.hasUserPurchased(userId, productBoxId)
    if (hasPurchased) {
      console.log("✅ [Check Access] Access granted via product box purchase check")
      return NextResponse.json({
        hasAccess: true,
        accessMethod: "product_box_purchase_check",
        note: "READ-ONLY: Access check only",
      })
    }

    // Method 3: Check bundlePurchases collection with buyer UID verification
    const purchasesQuery = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", userId)
      .where("productBoxId", "==", productBoxId)
      .where("status", "==", "completed")
      .get()

    if (!purchasesQuery.empty) {
      const purchase = purchasesQuery.docs[0].data()
      console.log("✅ [Check Access] Access granted via bundlePurchases collection:", {
        buyerUid: purchase.buyerUid,
        productBoxId: purchase.productBoxId,
        sessionId: purchase.sessionId,
      })
      return NextResponse.json({
        hasAccess: true,
        purchase,
        accessMethod: "bundle_purchases_collection",
        note: "READ-ONLY: Access check only",
      })
    }

    // Method 4: Check by session ID if provided
    if (sessionId) {
      // Check bundlePurchases by session ID
      const bundleSessionDoc = await db.collection("bundlePurchases").doc(sessionId).get()
      if (bundleSessionDoc.exists) {
        const purchase = bundleSessionDoc.data()!

        // Verify the buyer UID matches
        if (
          purchase.buyerUid === userId &&
          (purchase.productBoxId === productBoxId || purchase.bundleId === productBoxId)
        ) {
          console.log("✅ [Check Access] Access granted via bundle session ID lookup with buyer verification")
          return NextResponse.json({
            hasAccess: true,
            purchase,
            accessMethod: "bundle_session_id_lookup_verified",
            note: "READ-ONLY: Access check only",
          })
        }
      }
    }

    console.log("❌ [Check Access] No access found for user:", { userId, productBoxId, sessionId })
    return NextResponse.json({
      hasAccess: false,
      message: "No purchase found for this user and product",
      checkedMethods: [
        "unified_purchase_service",
        "product_box_purchase_check",
        "bundle_purchases_collection",
        "bundle_session_id_lookup",
      ],
      note: "READ-ONLY: Access check only",
    })
  } catch (error) {
    console.error("❌ [Check Access] Error checking product box access:", error)
    return NextResponse.json({ error: "Failed to check access" }, { status: 500 })
  }
}
