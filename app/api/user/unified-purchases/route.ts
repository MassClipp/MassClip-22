import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`🔍 [Unified Purchases API] Fetching purchases for user: ${userId}`)

    const allPurchases: any[] = []

    // Helper function to get bundle details including thumbnail (fallback only)
    const getBundleDetails = async (bundleId: string) => {
      try {
        const bundleDoc = await db.collection("bundles").doc(bundleId).get()
        if (bundleDoc.exists) {
          const bundleData = bundleDoc.data()
          return {
            title: bundleData?.title || "Untitled Bundle",
            thumbnail: bundleData?.customPreviewThumbnail || bundleData?.thumbnailUrl,
            description: bundleData?.description,
            creatorId: bundleData?.creatorId,
          }
        }
      } catch (error) {
        console.warn(`⚠️ [Unified Purchases] Could not fetch bundle ${bundleId}:`, error)
      }
      return null
    }

    // Helper function to get creator details (fallback only)
    const getCreatorDetails = async (creatorId: string) => {
      try {
        const creatorDoc = await db.collection("users").doc(creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()
          return {
            username: creatorData?.username || "Unknown",
            displayName: creatorData?.displayName,
          }
        }
      } catch (error) {
        console.warn(`⚠️ [Unified Purchases] Could not fetch creator ${creatorId}:`, error)
      }
      return { username: "Unknown" }
    }

    // 1. Check bundlePurchases collection (primary source) - ENHANCED with stored data
    try {
      const bundlePurchasesQuery = db
        .collection("bundlePurchases")
        .where("buyerUid", "==", userId)
        .where("status", "==", "completed")

      const bundleSnapshot = await bundlePurchasesQuery.get()
      console.log(`✅ [Unified Purchases] Found ${bundleSnapshot.size} bundlePurchases`)

      for (const doc of bundleSnapshot.docs) {
        const data = doc.data()
        const bundleId = data.bundleId || data.productBoxId

        // Use stored bundle data directly (no need to re-fetch if we have complete data)
        const hasCompleteData = data.productBoxTitle && data.creatorName && data.items

        let bundleDetails = null
        let creatorDetails = null

        if (!hasCompleteData) {
          // Fallback: fetch missing data
          bundleDetails = await getBundleDetails(bundleId)
          creatorDetails = await getCreatorDetails(data.creatorId)
        }

        allPurchases.push({
          id: doc.id,
          productBoxId: bundleId,
          bundleTitle: data.bundleTitle || data.productBoxTitle || bundleDetails?.title || "Untitled Bundle",
          productBoxTitle: data.productBoxTitle || data.bundleTitle || bundleDetails?.title || "Untitled Bundle",
          productBoxDescription: data.productBoxDescription || bundleDetails?.description || "Premium content bundle",
          thumbnailUrl: data.thumbnailUrl || data.productBoxThumbnail || bundleDetails?.thumbnail,
          productBoxThumbnail: data.productBoxThumbnail || data.thumbnailUrl || bundleDetails?.thumbnail,
          creatorUsername: data.creatorUsername || creatorDetails?.username || "unknown",
          creatorName: data.creatorName || creatorDetails?.displayName || creatorDetails?.username || "Unknown Creator",
          creatorId: data.creatorId,
          purchaseDate: data.purchasedAt || data.createdAt || data.completedAt,
          purchasedAt: data.purchasedAt || data.createdAt || data.completedAt,
          amount: data.amount || 0,
          currency: data.currency || "usd",
          status: data.status,
          source: "bundlePurchases",
          contents: data.items || data.contents || [],
          items: data.items || data.contents || [],
          contentCount: data.totalItems || data.contentCount || 1,
          totalItems: data.totalItems || data.contentCount || 1,
          totalSize: data.totalSize || 0,
        })
      }
    } catch (error) {
      console.warn(`⚠️ [Unified Purchases] Error checking bundlePurchases:`, error)
    }

    // 2. Check productBoxPurchases collection
    try {
      const productBoxPurchasesQuery = db
        .collection("productBoxPurchases")
        .where("buyerUid", "==", userId)
        .where("status", "==", "completed")

      const productBoxSnapshot = await productBoxPurchasesQuery.get()
      console.log(`✅ [Unified Purchases] Found ${productBoxSnapshot.size} productBoxPurchases`)

      for (const doc of productBoxSnapshot.docs) {
        const data = doc.data()
        const bundleId = data.productBoxId

        // Check if we already have this purchase
        const existingPurchase = allPurchases.find((p) => p.productBoxId === bundleId)
        if (!existingPurchase) {
          // Get bundle details including thumbnail
          const bundleDetails = await getBundleDetails(bundleId)
          const creatorDetails = await getCreatorDetails(data.creatorId)

          allPurchases.push({
            id: doc.id,
            productBoxId: bundleId,
            bundleTitle: bundleDetails?.title || "Untitled Bundle",
            productBoxTitle: bundleDetails?.title || "Untitled Bundle",
            productBoxDescription: bundleDetails?.description || data.description || "Premium content bundle",
            thumbnailUrl: bundleDetails?.thumbnail,
            productBoxThumbnail: bundleDetails?.thumbnail,
            creatorUsername: creatorDetails.username,
            creatorName: creatorDetails.displayName || creatorDetails.username,
            creatorId: data.creatorId,
            purchaseDate: data.createdAt || data.completedAt,
            purchasedAt: data.createdAt || data.completedAt,
            amount: data.amount || 0,
            currency: data.currency || "usd",
            status: data.status,
            source: "productBoxPurchases",
            items: data.items || [],
            totalItems: data.totalItems || 0,
            totalSize: data.totalSize || 0,
          })
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Unified Purchases] Error checking productBoxPurchases:`, error)
    }

    // 3. Check unifiedPurchases collection
    try {
      const unifiedPurchasesQuery = db
        .collection("unifiedPurchases")
        .where("userId", "==", userId)
        .where("status", "==", "completed")

      const unifiedSnapshot = await unifiedPurchasesQuery.get()
      console.log(`✅ [Unified Purchases] Found ${unifiedSnapshot.size} unifiedPurchases`)

      for (const doc of unifiedSnapshot.docs) {
        const data = doc.data()
        const bundleId = data.productBoxId || data.bundleId

        // Check if we already have this purchase
        const existingPurchase = allPurchases.find((p) => p.productBoxId === bundleId)
        if (!existingPurchase) {
          // Get bundle details including thumbnail
          const bundleDetails = await getBundleDetails(bundleId)
          const creatorDetails = await getCreatorDetails(data.creatorId)

          allPurchases.push({
            id: doc.id,
            productBoxId: bundleId,
            bundleTitle: bundleDetails?.title || data.bundleTitle || "Untitled Bundle",
            productBoxTitle: bundleDetails?.title || data.bundleTitle || "Untitled Bundle",
            productBoxDescription: bundleDetails?.description || data.description || "Premium content bundle",
            thumbnailUrl: bundleDetails?.thumbnail,
            productBoxThumbnail: bundleDetails?.thumbnail,
            creatorUsername: creatorDetails.username,
            creatorName: creatorDetails.displayName || creatorDetails.username,
            creatorId: data.creatorId,
            purchaseDate: data.purchaseDate || data.createdAt,
            purchasedAt: data.purchaseDate || data.createdAt,
            amount: data.amount || 0,
            currency: data.currency || "usd",
            status: data.status,
            source: "unifiedPurchases",
            contents: data.items || [],
            items: data.items || [],
            contentCount: data.totalItems || 0,
            totalItems: data.totalItems || 0,
            totalSize: data.totalSize || 0,
          })
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Unified Purchases] Error checking unifiedPurchases:`, error)
    }

    // 4. Check purchases collection (legacy)
    try {
      const purchasesQuery = db.collection("purchases").where("userId", "==", userId).where("status", "==", "completed")

      const purchasesSnapshot = await purchasesQuery.get()
      console.log(`✅ [Unified Purchases] Found ${purchasesSnapshot.size} legacy purchases`)

      for (const doc of purchasesSnapshot.docs) {
        const data = doc.data()
        const bundleId = data.productBoxId || data.bundleId || data.itemId

        // Check if we already have this purchase
        const existingPurchase = allPurchases.find((p) => p.productBoxId === bundleId)
        if (!existingPurchase) {
          // Get bundle details including thumbnail
          const bundleDetails = await getBundleDetails(bundleId)
          const creatorDetails = await getCreatorDetails(data.creatorId)

          allPurchases.push({
            id: doc.id,
            productBoxId: bundleId,
            bundleTitle: bundleDetails?.title || data.itemTitle || "Untitled Bundle",
            productBoxTitle: bundleDetails?.title || data.itemTitle || "Untitled Bundle",
            productBoxDescription: bundleDetails?.description || data.itemDescription || "Premium content bundle",
            thumbnailUrl: bundleDetails?.thumbnail || data.thumbnailUrl,
            productBoxThumbnail: bundleDetails?.thumbnail || data.thumbnailUrl,
            creatorUsername: creatorDetails.username,
            creatorName: creatorDetails.displayName || creatorDetails.username,
            creatorId: data.creatorId,
            purchaseDate: data.purchasedAt || data.createdAt,
            purchasedAt: data.purchasedAt || data.createdAt,
            amount: data.amount || 0,
            currency: data.currency || "usd",
            status: data.status,
            source: "purchases",
            items: data.items || [],
            totalItems: data.totalItems || 0,
            totalSize: data.totalSize || 0,
          })
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Unified Purchases] Error checking purchases:`, error)
    }

    // Sort by purchase date (newest first)
    allPurchases.sort((a, b) => {
      const dateA = new Date(a.purchasedAt || 0).getTime()
      const dateB = new Date(b.purchasedAt || 0).getTime()
      return dateB - dateA
    })

    console.log(`✅ [Unified Purchases API] Total unique purchases found: ${allPurchases.length}`)
    console.log(`📦 [Unified Purchases API] Sample purchase data:`, allPurchases[0] || "No purchases")

    return NextResponse.json({
      purchases: allPurchases,
      totalCount: allPurchases.length,
      userId,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error(`❌ [Unified Purchases API] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error.message,
        purchases: [],
      },
      { status: 500 },
    )
  }
}
