import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [Anonymous Purchases] Fetching anonymous purchases`)

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
        console.warn(`⚠️ [Anonymous Purchases] Could not fetch bundle ${bundleId}:`, error)
      }
      return null
    }

    // 1. Check bundlePurchases collection for anonymous purchases
    try {
      const anonymousBundlePurchasesQuery = db
        .collection("bundlePurchases")
        .where("buyerUid", "==", "anonymous")
        .where("status", "==", "completed")

      const bundleSnapshot = await anonymousBundlePurchasesQuery.get()
      console.log(`✅ [Anonymous Purchases] Found ${bundleSnapshot.size} anonymous bundlePurchases`)

      for (const doc of bundleSnapshot.docs) {
        const data = doc.data()
        const bundleId = data.bundleId || data.productBoxId

        // Get bundle details including thumbnail
        const bundleDetails = await getBundleDetails(bundleId)

        allPurchases.push({
          id: doc.id,
          productBoxId: bundleId,
          bundleTitle: bundleDetails?.title || data.bundleTitle || "Untitled Bundle",
          productBoxTitle: bundleDetails?.title || data.bundleTitle || "Untitled Bundle",
          productBoxDescription: bundleDetails?.description || data.description || "Premium content bundle",
          thumbnailUrl: bundleDetails?.thumbnail || data.thumbnailUrl,
          productBoxThumbnail: bundleDetails?.thumbnail || data.thumbnailUrl,
          creatorUsername: data.creatorUsername || "unknown",
          creatorName: data.creatorName || data.creatorUsername || "Unknown Creator",
          creatorId: data.creatorId || "unknown",
          purchaseDate: data.createdAt || data.completedAt,
          purchasedAt: data.createdAt || data.completedAt,
          amount: data.amount || 0,
          currency: data.currency || "usd",
          status: data.status,
          source: "bundlePurchases_anonymous",
          contents: data.contents || data.items || [],
          items: data.contents || data.items || [],
          contentCount: data.contentCount || data.totalItems || 0,
          totalItems: data.contentCount || data.totalItems || 0,
          totalSize: data.totalSize || 0,
          anonymousAccess: true,
        })
      }
    } catch (error) {
      console.warn(`⚠️ [Anonymous Purchases] Error checking bundlePurchases:`, error)
    }

    // 2. Check anonymousPurchases collection as fallback
    try {
      const anonymousPurchasesQuery = db.collection("anonymousPurchases")

      const anonymousSnapshot = await anonymousPurchasesQuery.get()
      console.log(`✅ [Anonymous Purchases] Found ${anonymousSnapshot.size} anonymousPurchases`)

      for (const doc of anonymousSnapshot.docs) {
        const data = doc.data()
        const bundleId = data.bundleId || data.productBoxId

        // Check if we already have this purchase
        const existingPurchase = allPurchases.find((p) => p.productBoxId === bundleId)
        if (!existingPurchase) {
          // Get bundle details including thumbnail
          const bundleDetails = await getBundleDetails(bundleId)

          allPurchases.push({
            id: doc.id,
            productBoxId: bundleId,
            bundleTitle: bundleDetails?.title || data.bundleTitle || "Untitled Bundle",
            productBoxTitle: bundleDetails?.title || data.bundleTitle || "Untitled Bundle",
            productBoxDescription: bundleDetails?.description || data.description || "Premium content bundle",
            thumbnailUrl: bundleDetails?.thumbnail || data.thumbnailUrl,
            productBoxThumbnail: bundleDetails?.thumbnail || data.thumbnailUrl,
            creatorUsername: data.creatorUsername || "unknown",
            creatorName: data.creatorName || data.creatorUsername || "Unknown Creator",
            creatorId: data.creatorId || "unknown",
            purchaseDate: data.createdAt || data.completedAt,
            purchasedAt: data.createdAt || data.completedAt,
            amount: data.amount || 0,
            currency: data.currency || "usd",
            status: data.status || "completed",
            source: "anonymousPurchases",
            contents: data.contents || data.items || [],
            items: data.contents || data.items || [],
            contentCount: data.contentCount || data.totalItems || 0,
            totalItems: data.contentCount || data.totalItems || 0,
            totalSize: data.totalSize || 0,
            anonymousAccess: true,
          })
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Anonymous Purchases] Error checking anonymousPurchases:`, error)
    }

    // Sort by purchase date (newest first)
    allPurchases.sort((a, b) => {
      const dateA = new Date(a.purchasedAt || 0).getTime()
      const dateB = new Date(b.purchasedAt || 0).getTime()
      return dateB - dateA
    })

    console.log(`✅ [Anonymous Purchases] Total anonymous purchases found: ${allPurchases.length}`)

    return NextResponse.json({
      purchases: allPurchases,
      totalCount: allPurchases.length,
      isAnonymous: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error(`❌ [Anonymous Purchases] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch anonymous purchases",
        details: error.message,
        purchases: [],
      },
      { status: 500 },
    )
  }
}
