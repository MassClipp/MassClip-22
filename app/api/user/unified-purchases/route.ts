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

    // Helper function to get bundle details including thumbnail
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

    // Helper function to get creator details
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

    // 1. Check bundlePurchases collection (primary source)
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

        // Get bundle details including thumbnail
        const bundleDetails = await getBundleDetails(bundleId)
        const creatorDetails = await getCreatorDetails(data.creatorId)

        allPurchases.push({
          id: doc.id,
          productBoxId: bundleId,
          bundleTitle: bundleDetails?.title || data.bundleTitle || "Untitled Bundle",
          productBoxTitle: bundleDetails?.title || data.bundleTitle || "Untitled Bundle",
          thumbnailUrl: bundleDetails?.thumbnail,
          productBoxThumbnail: bundleDetails?.thumbnail,
          creatorUsername: creatorDetails.username,
          creatorId: data.creatorId,
          purchaseDate: data.createdAt || data.completedAt,
          purchasedAt: data.createdAt || data.completedAt,
          amount: data.amount || 0,
          currency: data.currency || "usd",
          status: data.status,
          source: "bundlePurchases",
          contents: data.contents || [],
          contentCount: data.contentCount || 0,
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
            thumbnailUrl: bundleDetails?.thumbnail,
            productBoxThumbnail: bundleDetails?.thumbnail,
            creatorUsername: creatorDetails.username,
            creatorId: data.creatorId,
            purchaseDate: data.createdAt || data.completedAt,
            purchasedAt: data.createdAt || data.completedAt,
            amount: data.amount || 0,
            currency: data.currency || "usd",
            status: data.status,
            source: "productBoxPurchases",
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
            thumbnailUrl: bundleDetails?.thumbnail,
            productBoxThumbnail: bundleDetails?.thumbnail,
            creatorUsername: creatorDetails.username,
            creatorId: data.creatorId,
            purchaseDate: data.purchaseDate || data.createdAt,
            purchasedAt: data.purchaseDate || data.createdAt,
            amount: data.amount || 0,
            currency: data.currency || "usd",
            status: data.status,
            source: "unifiedPurchases",
            contents: data.items || [],
            contentCount: data.totalItems || 0,
            totalSize: data.totalSize || 0,
          })
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Unified Purchases] Error checking unifiedPurchases:`, error)
    }

    console.log(`✅ [Unified Purchases API] Total unique purchases found: ${allPurchases.length}`)

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
