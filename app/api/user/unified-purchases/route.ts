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

    // Check multiple collections for purchases
    const allPurchases: any[] = []

    // 1. Check productBoxPurchases collection
    try {
      const productBoxPurchasesQuery = db
        .collection("productBoxPurchases")
        .where("buyerUid", "==", userId)
        .where("status", "==", "completed")

      const productBoxSnapshot = await productBoxPurchasesQuery.get()
      console.log(`✅ [Unified Purchases] Found ${productBoxSnapshot.size} productBoxPurchases`)

      for (const doc of productBoxSnapshot.docs) {
        const data = doc.data()

        // Get bundle details
        let bundleData = null
        try {
          const bundleDoc = await db.collection("productBoxes").doc(data.productBoxId).get()
          if (bundleDoc.exists) {
            bundleData = bundleDoc.data()
          }
        } catch (error) {
          console.warn(`⚠️ [Unified Purchases] Could not fetch bundle ${data.productBoxId}:`, error)
        }

        // Get creator details
        let creatorData = null
        if (data.creatorId) {
          try {
            const creatorDoc = await db.collection("users").doc(data.creatorId).get()
            if (creatorDoc.exists) {
              creatorData = creatorDoc.data()
            }
          } catch (error) {
            console.warn(`⚠️ [Unified Purchases] Could not fetch creator ${data.creatorId}:`, error)
          }
        }

        allPurchases.push({
          id: doc.id,
          productBoxId: data.productBoxId,
          bundleTitle: bundleData?.title || "Untitled Bundle",
          productBoxTitle: bundleData?.title || "Untitled Bundle",
          thumbnailUrl: bundleData?.thumbnailUrl || bundleData?.customPreviewThumbnail,
          productBoxThumbnail: bundleData?.thumbnailUrl || bundleData?.customPreviewThumbnail,
          creatorUsername: creatorData?.username || "Unknown",
          creatorId: data.creatorId,
          purchaseDate: data.createdAt || data.completedAt,
          purchasedAt: data.createdAt || data.completedAt,
          amount: data.amount || 0,
          currency: data.currency || "usd",
          status: data.status,
          source: "productBoxPurchases",
        })
      }
    } catch (error) {
      console.warn(`⚠️ [Unified Purchases] Error checking productBoxPurchases:`, error)
    }

    // 2. Check unifiedPurchases collection
    try {
      const unifiedPurchasesQuery = db
        .collection("unifiedPurchases")
        .where("userId", "==", userId)
        .where("status", "==", "completed")

      const unifiedSnapshot = await unifiedPurchasesQuery.get()
      console.log(`✅ [Unified Purchases] Found ${unifiedSnapshot.size} unifiedPurchases`)

      for (const doc of unifiedSnapshot.docs) {
        const data = doc.data()

        // Check if we already have this purchase
        const existingPurchase = allPurchases.find((p) => p.productBoxId === data.productBoxId)
        if (!existingPurchase) {
          // Get bundle details
          let bundleData = null
          try {
            const bundleDoc = await db
              .collection("productBoxes")
              .doc(data.productBoxId || data.bundleId)
              .get()
            if (bundleDoc.exists) {
              bundleData = bundleDoc.data()
            }
          } catch (error) {
            console.warn(`⚠️ [Unified Purchases] Could not fetch bundle ${data.productBoxId}:`, error)
          }

          // Get creator details
          let creatorData = null
          if (data.creatorId) {
            try {
              const creatorDoc = await db.collection("users").doc(data.creatorId).get()
              if (creatorDoc.exists) {
                creatorData = creatorDoc.data()
              }
            } catch (error) {
              console.warn(`⚠️ [Unified Purchases] Could not fetch creator ${data.creatorId}:`, error)
            }
          }

          allPurchases.push({
            id: doc.id,
            productBoxId: data.productBoxId || data.bundleId,
            bundleTitle: bundleData?.title || "Untitled Bundle",
            productBoxTitle: bundleData?.title || "Untitled Bundle",
            thumbnailUrl: bundleData?.thumbnailUrl || bundleData?.customPreviewThumbnail,
            productBoxThumbnail: bundleData?.thumbnailUrl || bundleData?.customPreviewThumbnail,
            creatorUsername: creatorData?.username || "Unknown",
            creatorId: data.creatorId,
            purchaseDate: data.purchaseDate || data.createdAt,
            purchasedAt: data.purchaseDate || data.createdAt,
            amount: data.amount || 0,
            currency: data.currency || "usd",
            status: data.status,
            source: "unifiedPurchases",
          })
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Unified Purchases] Error checking unifiedPurchases:`, error)
    }

    // 3. Check userPurchases subcollection
    try {
      const userPurchasesQuery = db.collection("userPurchases").doc(userId).collection("purchases")
      const userPurchasesSnapshot = await userPurchasesQuery.get()
      console.log(`✅ [Unified Purchases] Found ${userPurchasesSnapshot.size} userPurchases`)

      userPurchasesSnapshot.forEach((doc) => {
        const data = doc.data()

        // Check if we already have this purchase
        const existingPurchase = allPurchases.find((p) => p.productBoxId === data.productBoxId)
        if (!existingPurchase) {
          allPurchases.push({
            id: doc.id,
            productBoxId: data.productBoxId,
            bundleTitle: data.productBoxTitle || data.bundleTitle || "Untitled Bundle",
            productBoxTitle: data.productBoxTitle || data.bundleTitle || "Untitled Bundle",
            thumbnailUrl: data.productBoxThumbnail || data.thumbnailUrl,
            productBoxThumbnail: data.productBoxThumbnail || data.thumbnailUrl,
            creatorUsername: data.creatorUsername || "Unknown",
            creatorId: data.creatorId,
            purchaseDate: data.purchasedAt || data.purchaseDate,
            purchasedAt: data.purchasedAt || data.purchaseDate,
            amount: data.amount || 0,
            currency: data.currency || "usd",
            status: "completed",
            source: "userPurchases",
          })
        }
      })
    } catch (error) {
      console.warn(`⚠️ [Unified Purchases] Error checking userPurchases:`, error)
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
