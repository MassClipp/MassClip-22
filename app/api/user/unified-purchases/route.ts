import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { headers } from "next/headers"

async function getUserIdFromHeader(): Promise<string | null> {
  const headersList = headers()
  const authorization = headersList.get("authorization")

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null
  }

  const token = authorization.split("Bearer ")[1]
  try {
    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken.uid
  } catch (error) {
    console.error("❌ [Unified Purchases API] Auth error:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromHeader()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
          source: "bundlePurchases",
          contents: data.contents || [],
          items: data.contents || [],
          contentCount: data.contentCount || 0,
          totalItems: data.contentCount || 0,
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
            bundleTitle: bundleDetails?.title || data.bundleTitle || "Untitled Bundle",
            productBoxTitle: bundleDetails?.title || data.bundleTitle || "Untitled Bundle",
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

    return NextResponse.json({
      success: true,
      purchases: allPurchases,
      totalCount: allPurchases.length,
      userId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ [Unified Purchases API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
