import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { verifyIdTokenFromRequest } from "@/lib/auth-utils" // Import the verifyIdTokenFromRequest function

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
            items: data.items || [],
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
