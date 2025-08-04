import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`🔍 [Unified Purchases API] Fetching purchases for user: ${userId}`)

    // Try to get bundle purchases without ordering first (in case index is missing)
    let bundlePurchasesSnapshot
    try {
      bundlePurchasesSnapshot = await db
        .collection("bundlePurchases")
        .where("buyerUid", "==", userId)
        .orderBy("createdAt", "desc")
        .get()
    } catch (indexError) {
      console.warn("⚠️ [Unified Purchases API] Index missing, using simple query")
      // Fallback to simple query without ordering
      bundlePurchasesSnapshot = await db.collection("bundlePurchases").where("buyerUid", "==", userId).get()
    }

    const purchases = []

    for (const doc of bundlePurchasesSnapshot.docs) {
      const data = doc.data()
      console.log(`🔍 [Unified Purchases API] Processing bundle purchase:`, data)

      // Get creator info safely
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

      // Get bundle info safely
      let bundleTitle = data.bundleTitle || "Untitled Bundle"
      let thumbnailUrl = null
      let contentCount = data.contentCount || 0

      if (data.bundleId) {
        try {
          const bundleDoc = await db.collection("bundles").doc(data.bundleId).get()
          if (bundleDoc.exists) {
            const bundleData = bundleDoc.data()
            bundleTitle = bundleData?.title || bundleTitle
            thumbnailUrl = bundleData?.thumbnailUrl || null
            contentCount = bundleData?.contentCount || contentCount
          }
        } catch (error) {
          console.warn(`⚠️ [Unified Purchases API] Could not fetch bundle info for ${data.bundleId}:`, error)
        }
      }

      purchases.push({
        id: doc.id,
        title: bundleTitle,
        description: data.description || "",
        price: (data.amount || 0) / 100, // Convert cents to dollars
        currency: "usd",
        status: "completed",
        createdAt: data.createdAt || data.completedAt || new Date(),
        updatedAt: data.updatedAt || data.createdAt || new Date(),
        bundleId: data.bundleId,
        creatorId: data.creatorId,
        creatorUsername,
        type: "bundle",
        thumbnailUrl,
        metadata: {
          title: bundleTitle,
          description: data.description || "",
          contentCount,
          thumbnailUrl,
        },
      })
    }

    // Try to get product box purchases (if collection exists)
    try {
      let productBoxPurchasesSnapshot
      try {
        productBoxPurchasesSnapshot = await db
          .collection("productBoxPurchases")
          .where("buyerUid", "==", userId)
          .orderBy("createdAt", "desc")
          .get()
      } catch (indexError) {
        console.warn("⚠️ [Unified Purchases API] Product box index missing, using simple query")
        productBoxPurchasesSnapshot = await db.collection("productBoxPurchases").where("buyerUid", "==", userId).get()
      }

      for (const doc of productBoxPurchasesSnapshot.docs) {
        const data = doc.data()
        console.log(`🔍 [Unified Purchases API] Processing product box purchase:`, data)

        // Get creator info safely
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
          price: (data.amount || 0) / 100, // Convert cents to dollars
          currency: "usd",
          status: "completed",
          createdAt: data.createdAt || data.completedAt || new Date(),
          updatedAt: data.updatedAt || data.createdAt || new Date(),
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
      console.warn(`⚠️ [Unified Purchases API] Could not fetch product box purchases (collection may not exist):`, error)
    }

    // Sort all purchases by date manually
    purchases.sort((a, b) => {
      const getTime = (dateField: any) => {
        if (!dateField) return 0
        if (dateField.toDate && typeof dateField.toDate === "function") {
          return dateField.toDate().getTime()
        }
        if (dateField.seconds) {
          return dateField.seconds * 1000
        }
        if (typeof dateField === "string") {
          return new Date(dateField).getTime()
        }
        if (dateField instanceof Date) {
          return dateField.getTime()
        }
        return 0
      }

      return getTime(b.createdAt) - getTime(a.createdAt) // Newest first
    })

    console.log(`✅ [Unified Purchases API] Returning ${purchases.length} purchases`)

    return NextResponse.json({
      success: true,
      purchases,
      total: purchases.length,
    })
  } catch (error: any) {
    console.error("❌ [Unified Purchases API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch purchases",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
