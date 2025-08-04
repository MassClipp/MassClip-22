import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`🔍 [Unified Purchases API] Fetching purchases for user: ${userId}`)

    // Get bundle purchases
    const bundlePurchasesSnapshot = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", userId)
      .orderBy("completedAt", "desc")
      .get()

    const purchases = []

    for (const doc of bundlePurchasesSnapshot.docs) {
      const data = doc.data()
      console.log(`🔍 [Unified Purchases API] Processing bundle purchase:`, data)

      // Get creator info
      let creatorUsername = "Unknown Creator"
      if (data.creatorId) {
        try {
          const creatorDoc = await db.collection("users").doc(data.creatorId).get()
          if (creatorDoc.exists) {
            const creatorData = creatorDoc.data()
            creatorUsername =
              creatorData?.username || creatorData?.displayName || creatorData?.name || "Unknown Creator"
          }
        } catch (error) {
          console.warn(`⚠️ [Unified Purchases API] Could not fetch creator info for ${data.creatorId}:`, error)
        }
      }

      // Get bundle thumbnail
      let thumbnailUrl = null
      if (data.bundleId) {
        try {
          const bundleDoc = await db.collection("bundles").doc(data.bundleId).get()
          if (bundleDoc.exists) {
            const bundleData = bundleDoc.data()
            thumbnailUrl = bundleData?.thumbnailUrl || null
          }
        } catch (error) {
          console.warn(`⚠️ [Unified Purchases API] Could not fetch bundle thumbnail for ${data.bundleId}:`, error)
        }
      }

      purchases.push({
        id: doc.id,
        title: data.bundleTitle || "Untitled Bundle",
        description: data.description || "",
        price: data.amount || 0,
        currency: "usd",
        status: "completed",
        createdAt: data.completedAt || data.createdAt || new Date(),
        updatedAt: data.completedAt || data.createdAt || new Date(),
        bundleId: data.bundleId,
        creatorId: data.creatorId,
        creatorUsername,
        type: "bundle",
        thumbnailUrl,
        metadata: {
          title: data.bundleTitle || "Untitled Bundle",
          description: data.description || "",
          contentCount: data.contentCount || 0,
          thumbnailUrl,
        },
      })
    }

    // Get product box purchases (if any)
    try {
      const productBoxPurchasesSnapshot = await db
        .collection("productBoxPurchases")
        .where("buyerUid", "==", userId)
        .orderBy("completedAt", "desc")
        .get()

      for (const doc of productBoxPurchasesSnapshot.docs) {
        const data = doc.data()
        console.log(`🔍 [Unified Purchases API] Processing product box purchase:`, data)

        // Get creator info
        let creatorUsername = "Unknown Creator"
        if (data.creatorId) {
          try {
            const creatorDoc = await db.collection("users").doc(data.creatorId).get()
            if (creatorDoc.exists) {
              const creatorData = creatorDoc.data()
              creatorUsername =
                creatorData?.username || creatorData?.displayName || creatorData?.name || "Unknown Creator"
            }
          } catch (error) {
            console.warn(`⚠️ [Unified Purchases API] Could not fetch creator info for ${data.creatorId}:`, error)
          }
        }

        purchases.push({
          id: doc.id,
          title: data.productBoxTitle || "Untitled Product",
          description: data.description || "",
          price: data.amount || 0,
          currency: "usd",
          status: "completed",
          createdAt: data.completedAt || data.createdAt || new Date(),
          updatedAt: data.completedAt || data.createdAt || new Date(),
          productBoxId: data.productBoxId,
          creatorId: data.creatorId,
          creatorUsername,
          type: "product_box",
          metadata: {
            title: data.productBoxTitle || "Untitled Product",
            description: data.description || "",
            contentCount: data.contentCount || 0,
          },
        })
      }
    } catch (error) {
      console.warn(`⚠️ [Unified Purchases API] Could not fetch product box purchases:`, error)
    }

    // Sort all purchases by date
    purchases.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })

    console.log(`✅ [Unified Purchases API] Returning ${purchases.length} purchases`)

    return NextResponse.json({
      success: true,
      purchases,
    })
  } catch (error: any) {
    console.error("❌ [Unified Purchases API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
