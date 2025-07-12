import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Unified Purchases] Fetching purchases for user: ${userId}`)

    const purchases: any[] = []

    // 1. Fetch from bundlePurchases (primary)
    try {
      const bundlePurchasesSnapshot = await db
        .collection("bundlePurchases")
        .where("buyerUid", "==", userId)
        .orderBy("createdAt", "desc")
        .get()

      console.log(`📦 [Unified Purchases] Found ${bundlePurchasesSnapshot.docs.length} bundle purchases`)

      for (const doc of bundlePurchasesSnapshot.docs) {
        const data = doc.data()
        purchases.push({
          id: doc.id,
          source: "bundlePurchases",
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          completedAt: data.completedAt?.toDate?.() || data.completedAt || data.createdAt?.toDate?.() || new Date(),
        })
      }
    } catch (error) {
      console.warn(`⚠️ [Unified Purchases] Error fetching bundle purchases:`, error)
    }

    // 2. Fetch from unifiedPurchases
    try {
      const unifiedPurchasesSnapshot = await db
        .collection("unifiedPurchases")
        .where("buyerUid", "==", userId)
        .orderBy("createdAt", "desc")
        .get()

      console.log(`🔄 [Unified Purchases] Found ${unifiedPurchasesSnapshot.docs.length} unified purchases`)

      for (const doc of unifiedPurchasesSnapshot.docs) {
        const data = doc.data()
        // Check if we already have this purchase from bundlePurchases
        const existingPurchase = purchases.find(
          (p) =>
            p.sessionId === data.sessionId ||
            p.stripeSessionId === data.stripeSessionId ||
            (p.productBoxId === data.productBoxId &&
              Math.abs(
                new Date(p.createdAt).getTime() - new Date(data.createdAt?.toDate?.() || data.createdAt).getTime(),
              ) < 60000),
        )

        if (!existingPurchase) {
          purchases.push({
            id: doc.id,
            source: "unifiedPurchases",
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
            completedAt: data.completedAt?.toDate?.() || data.completedAt || data.createdAt?.toDate?.() || new Date(),
          })
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Unified Purchases] Error fetching unified purchases:`, error)
    }

    // 3. Fetch from productBoxPurchases (fallback)
    try {
      const productBoxPurchasesSnapshot = await db
        .collection("productBoxPurchases")
        .where("buyerUid", "==", userId)
        .orderBy("createdAt", "desc")
        .get()

      console.log(`📋 [Unified Purchases] Found ${productBoxPurchasesSnapshot.docs.length} product box purchases`)

      for (const doc of productBoxPurchasesSnapshot.docs) {
        const data = doc.data()
        // Check if we already have this purchase
        const existingPurchase = purchases.find(
          (p) =>
            p.sessionId === data.sessionId ||
            p.stripeSessionId === data.stripeSessionId ||
            (p.productBoxId === data.productBoxId &&
              Math.abs(
                new Date(p.createdAt).getTime() - new Date(data.createdAt?.toDate?.() || data.createdAt).getTime(),
              ) < 60000),
        )

        if (!existingPurchase) {
          purchases.push({
            id: doc.id,
            source: "productBoxPurchases",
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
            completedAt: data.completedAt?.toDate?.() || data.completedAt || data.createdAt?.toDate?.() || new Date(),
          })
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Unified Purchases] Error fetching product box purchases:`, error)
    }

    // Sort by creation date (newest first)
    purchases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log(`✅ [Unified Purchases] Returning ${purchases.length} total purchases`)

    return NextResponse.json({
      success: true,
      purchases: purchases,
      count: purchases.length,
      sources: {
        bundlePurchases: purchases.filter((p) => p.source === "bundlePurchases").length,
        unifiedPurchases: purchases.filter((p) => p.source === "unifiedPurchases").length,
        productBoxPurchases: purchases.filter((p) => p.source === "productBoxPurchases").length,
      },
    })
  } catch (error: any) {
    console.error(`❌ [Unified Purchases] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error.message,
        purchases: [], // Always return empty array on error
        count: 0,
      },
      { status: 500 },
    )
  }
}
