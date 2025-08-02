import { type NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAdminAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`🔍 [Unified Purchases] Fetching purchases for user: ${userId}`)

    const db = getAdminDb()
    const purchases: any[] = []

    // Method 1: Check userPurchases collection (UnifiedPurchaseService)
    try {
      const userPurchasesRef = db.collection("userPurchases").doc(userId).collection("purchases")
      const userPurchasesSnapshot = await userPurchasesRef.orderBy("purchasedAt", "desc").get()

      console.log(`📊 [Unified Purchases] Found ${userPurchasesSnapshot.size} purchases in userPurchases`)

      userPurchasesSnapshot.forEach((doc) => {
        const data = doc.data()
        purchases.push({
          id: doc.id,
          source: "userPurchases",
          ...data,
          purchasedAt: data.purchasedAt?.toDate?.() || new Date(data.purchasedAt),
        })
      })
    } catch (error) {
      console.warn("⚠️ [Unified Purchases] Error fetching from userPurchases:", error)
    }

    // Method 2: Check main purchases collection
    try {
      const mainPurchasesSnapshot = await db
        .collection("purchases")
        .where("userId", "==", userId)
        .orderBy("purchasedAt", "desc")
        .get()

      console.log(`📊 [Unified Purchases] Found ${mainPurchasesSnapshot.size} purchases in main purchases`)

      mainPurchasesSnapshot.forEach((doc) => {
        const data = doc.data()
        // Avoid duplicates by checking if we already have this sessionId
        const existingPurchase = purchases.find((p) => p.sessionId === data.sessionId)
        if (!existingPurchase) {
          purchases.push({
            id: doc.id,
            source: "purchases",
            ...data,
            purchasedAt: data.purchasedAt?.toDate?.() || new Date(data.purchasedAt),
          })
        }
      })
    } catch (error) {
      console.warn("⚠️ [Unified Purchases] Error fetching from main purchases:", error)
    }

    // Method 3: Check bundlePurchases collection specifically
    try {
      const bundlePurchasesSnapshot = await db
        .collection("bundlePurchases")
        .where("userId", "==", userId)
        .orderBy("purchasedAt", "desc")
        .get()

      console.log(`📊 [Unified Purchases] Found ${bundlePurchasesSnapshot.size} purchases in bundlePurchases`)

      bundlePurchasesSnapshot.forEach((doc) => {
        const data = doc.data()
        // Avoid duplicates by checking if we already have this sessionId
        const existingPurchase = purchases.find((p) => p.sessionId === data.sessionId)
        if (!existingPurchase) {
          purchases.push({
            id: doc.id,
            source: "bundlePurchases",
            ...data,
            purchasedAt: data.purchasedAt?.toDate?.() || new Date(data.purchasedAt),
            // Ensure bundle-specific fields are present
            bundleId: data.bundleId || data.productBoxId,
            bundleTitle: data.bundleTitle || data.productBoxTitle || data.itemTitle,
            type: "bundle",
          })
        }
      })
    } catch (error) {
      console.warn("⚠️ [Unified Purchases] Error fetching from bundlePurchases:", error)
    }

    // Method 4: Check user's personal purchases subcollection
    try {
      const userSubPurchasesSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("purchases")
        .orderBy("purchasedAt", "desc")
        .get()

      console.log(`📊 [Unified Purchases] Found ${userSubPurchasesSnapshot.size} purchases in user subcollection`)

      userSubPurchasesSnapshot.forEach((doc) => {
        const data = doc.data()
        // Avoid duplicates by checking if we already have this sessionId
        const existingPurchase = purchases.find((p) => p.sessionId === data.sessionId)
        if (!existingPurchase) {
          purchases.push({
            id: doc.id,
            source: "userSubcollection",
            ...data,
            purchasedAt: data.purchasedAt?.toDate?.() || new Date(data.purchasedAt),
          })
        }
      })
    } catch (error) {
      console.warn("⚠️ [Unified Purchases] Error fetching from user subcollection:", error)
    }

    // Sort all purchases by date
    purchases.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())

    console.log(`✅ [Unified Purchases] Total unique purchases found: ${purchases.length}`)
    console.log(
      `📝 [Unified Purchases] Purchase sources:`,
      purchases.map((p) => ({
        sessionId: p.sessionId,
        source: p.source,
        type: p.type,
        title: p.bundleTitle || p.productBoxTitle || p.itemTitle,
      })),
    )

    return NextResponse.json({
      success: true,
      purchases: purchases.map((purchase) => ({
        id: purchase.id,
        sessionId: purchase.sessionId,
        bundleId: purchase.bundleId || purchase.productBoxId,
        bundleTitle: purchase.bundleTitle || purchase.productBoxTitle || purchase.itemTitle || "Untitled",
        bundleDescription:
          purchase.bundleDescription || purchase.productBoxDescription || purchase.itemDescription || "",
        thumbnailUrl: purchase.thumbnailUrl || purchase.customPreviewThumbnail || purchase.coverImage || "",
        amount: purchase.amount || 0,
        currency: purchase.currency || "usd",
        purchasedAt: purchase.purchasedAt,
        status: purchase.status || "completed",
        type: purchase.type || "bundle",
        creatorId: purchase.creatorId || "",
        creatorName: purchase.creatorName || "",
        creatorUsername: purchase.creatorUsername || "",
        items: purchase.items || purchase.contents || [],
        itemNames: purchase.itemNames || purchase.contentTitles || [],
        totalItems: purchase.totalItems || purchase.contentCount || purchase.items?.length || 0,
        totalSize: purchase.totalSize || 0,
        source: purchase.source, // For debugging
      })),
    })
  } catch (error) {
    console.error("❌ [Unified Purchases] Error fetching purchases:", error)
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 })
  }
}
