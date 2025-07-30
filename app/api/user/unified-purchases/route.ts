import { type NextRequest, NextResponse } from "next/server"
import { verifyIdTokenFromRequest } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Unified Purchases] Fetching user purchases...")

    // Verify the user is authenticated
    const decodedToken = await verifyIdTokenFromRequest(request)
    if (!decodedToken) {
      console.error("❌ [Unified Purchases] Authentication required")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("🔍 [Unified Purchases] Fetching purchases for user:", userId)

    // Get purchases from multiple sources
    const purchases: any[] = []

    // 1. Check bundlePurchases collection
    const bundlePurchasesQuery = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", userId)
      .orderBy("purchasedAt", "desc")
      .get()

    console.log(`📦 [Unified Purchases] Found ${bundlePurchasesQuery.size} bundle purchases`)

    bundlePurchasesQuery.forEach((doc) => {
      const data = doc.data()
      purchases.push({
        id: doc.id,
        type: "bundle",
        ...data,
        purchaseId: doc.id,
        sessionId: data.sessionId || doc.id,
      })
    })

    // 2. Check main purchases collection
    const mainPurchasesQuery = await db
      .collection("purchases")
      .where("buyerUid", "==", userId)
      .orderBy("purchasedAt", "desc")
      .get()

    console.log(`📦 [Unified Purchases] Found ${mainPurchasesQuery.size} main purchases`)

    mainPurchasesQuery.forEach((doc) => {
      const data = doc.data()
      // Avoid duplicates by checking if we already have this session
      const existingPurchase = purchases.find((p) => p.sessionId === data.sessionId)
      if (!existingPurchase) {
        purchases.push({
          id: doc.id,
          type: data.type || "product_box",
          ...data,
          purchaseId: doc.id,
        })
      }
    })

    // 3. Check user's personal purchases subcollection
    const userPurchasesQuery = await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .orderBy("purchasedAt", "desc")
      .get()

    console.log(`📦 [Unified Purchases] Found ${userPurchasesQuery.size} user subcollection purchases`)

    userPurchasesQuery.forEach((doc) => {
      const data = doc.data()
      // Avoid duplicates
      const existingPurchase = purchases.find((p) => p.sessionId === data.sessionId)
      if (!existingPurchase) {
        purchases.push({
          id: doc.id,
          type: data.type || "product_box",
          ...data,
          purchaseId: doc.id,
        })
      }
    })

    // Remove duplicates and sort by purchase date
    const uniquePurchases = purchases.reduce((acc, current) => {
      const existing = acc.find((item) => item.sessionId === current.sessionId)
      if (!existing) {
        acc.push(current)
      }
      return acc
    }, [] as any[])

    // Sort by purchase date (most recent first)
    uniquePurchases.sort((a, b) => {
      const dateA = a.purchasedAt?.toDate?.() || a.purchasedAt || new Date(0)
      const dateB = b.purchasedAt?.toDate?.() || b.purchasedAt || new Date(0)
      return dateB.getTime() - dateA.getTime()
    })

    console.log(`✅ [Unified Purchases] Returning ${uniquePurchases.length} unique purchases for user ${userId}`)
    console.log(
      `📝 [Unified Purchases] Purchase titles:`,
      uniquePurchases.map((p) => p.bundleTitle || p.productTitle),
    )

    return NextResponse.json({
      success: true,
      purchases: uniquePurchases,
      totalPurchases: uniquePurchases.length,
      userId: userId,
    })
  } catch (error) {
    console.error("❌ [Unified Purchases] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
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
    const decodedToken = await verifyIdTokenFromRequest(request)
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
      const bundlePurchaseQuery = await db
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
      const productPurchaseQuery = await db
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
      const mainPurchaseQuery = await db
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
