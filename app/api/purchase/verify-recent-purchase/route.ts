import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { verifyIdToken } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, buyerUid, creatorId } = await request.json()

    console.log("🔍 [Recent Purchase] Verifying recent purchase:", { productBoxId, buyerUid, creatorId })

    // Get authenticated user if available
    let authenticatedUser = null
    try {
      authenticatedUser = await verifyIdToken(request)
      console.log("✅ [Recent Purchase] Authenticated user:", authenticatedUser?.uid)
    } catch (error) {
      console.log("ℹ️ [Recent Purchase] No authenticated user")
    }

    const finalBuyerUid = authenticatedUser?.uid || buyerUid || "anonymous"

    // Look for recent purchases in multiple places
    let recentPurchase = null

    // 1. Check bundlePurchases collection for recent purchases
    const bundlePurchasesQuery = await db
      .collection("bundlePurchases")
      .where("bundleId", "==", productBoxId)
      .where("buyerUid", "==", finalBuyerUid)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get()

    if (!bundlePurchasesQuery.empty) {
      recentPurchase = bundlePurchasesQuery.docs[0].data()
      console.log("✅ [Recent Purchase] Found in bundlePurchases")
    }

    // 2. Check user's purchases subcollection if authenticated
    if (!recentPurchase && authenticatedUser) {
      const userPurchasesQuery = await db
        .collection("users")
        .doc(authenticatedUser.uid)
        .collection("purchases")
        .where("bundleId", "==", productBoxId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get()

      if (!userPurchasesQuery.empty) {
        recentPurchase = userPurchasesQuery.docs[0].data()
        console.log("✅ [Recent Purchase] Found in user purchases")
      }
    }

    // 3. Check recent checkout attempts
    if (!recentPurchase) {
      const checkoutAttemptsQuery = await db
        .collection("checkoutAttempts")
        .where("productBoxId", "==", productBoxId)
        .where("buyerUid", "==", finalBuyerUid)
        .where("status", "==", "completed")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get()

      if (!checkoutAttemptsQuery.empty) {
        const checkoutData = checkoutAttemptsQuery.docs[0].data()
        console.log("✅ [Recent Purchase] Found completed checkout attempt")

        // Create purchase record from checkout data
        recentPurchase = {
          id: checkoutData.sessionId,
          bundleId: productBoxId,
          bundleTitle: checkoutData.bundleTitle,
          buyerUid: finalBuyerUid,
          amount: checkoutData.amount,
          currency: checkoutData.currency,
          createdAt: checkoutData.createdAt,
          status: "completed",
        }
      }
    }

    if (!recentPurchase) {
      return NextResponse.json({ error: "No recent purchase found" }, { status: 404 })
    }

    // If we found a purchase but it's missing content data, enhance it
    if (!recentPurchase.contentCount || recentPurchase.contentCount === 0) {
      console.log("🔧 [Recent Purchase] Enhancing purchase with content data")

      // Call the comprehensive verification to enhance the purchase
      const enhanceResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/purchase/verify-and-complete-bundle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authenticatedUser && { Authorization: `Bearer ${await authenticatedUser.getIdToken?.()}` }),
          },
          body: JSON.stringify({
            sessionId: recentPurchase.id,
            productBoxId,
            forceComplete: true,
          }),
        },
      )

      if (enhanceResponse.ok) {
        const enhancedData = await enhanceResponse.json()
        if (enhancedData.success) {
          recentPurchase = enhancedData.purchase
        }
      }
    }

    console.log("✅ [Recent Purchase] Purchase verified:", {
      bundleTitle: recentPurchase.bundleTitle,
      contentCount: recentPurchase.contentCount || 0,
      buyerUid: recentPurchase.buyerUid,
    })

    return NextResponse.json({
      success: true,
      purchase: recentPurchase,
      message: "Recent purchase found and verified",
    })
  } catch (error) {
    console.error("❌ [Recent Purchase] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
