import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`🔍 [User Purchases] Fetching purchases for user: ${userId}`)

    // Get all purchases for this user from multiple collections
    const [videoPurchases, productBoxPurchases] = await Promise.all([
      // Video purchases
      db
        .collection("purchases")
        .where("buyerUid", "==", userId)
        .where("type", "==", "video")
        .orderBy("createdAt", "desc")
        .get(),

      // Product box purchases
      db
        .collection("purchases")
        .where("buyerUid", "==", userId)
        .where("type", "==", "product_box")
        .orderBy("createdAt", "desc")
        .get(),
    ])

    const purchases = []

    // Process video purchases
    for (const doc of videoPurchases.docs) {
      const purchaseData = doc.data()

      try {
        // Get video details
        const videoDoc = await db.collection("videos").doc(purchaseData.itemId).get()
        if (videoDoc.exists()) {
          const videoData = videoDoc.data()

          // Get creator details
          let creatorDetails = null
          if (videoData?.uid) {
            const creatorDoc = await db.collection("users").doc(videoData.uid).get()
            if (creatorDoc.exists()) {
              const creatorData = creatorDoc.data()
              creatorDetails = {
                name: creatorData?.displayName || creatorData?.username || "Unknown Creator",
                username: creatorData?.username || "",
              }
            }
          }

          if (creatorDetails) {
            purchases.push({
              id: doc.id,
              type: "video",
              itemId: purchaseData.itemId,
              itemTitle: videoData?.title || "Unknown Video",
              itemDescription: videoData?.description || "",
              creatorName: creatorDetails.name,
              creatorUsername: creatorDetails.username,
              price: purchaseData.amount || 0,
              currency: purchaseData.currency || "usd",
              purchasedAt: purchaseData.createdAt,
              status: purchaseData.status || "completed",
              thumbnailUrl: videoData?.thumbnailUrl || "",
              accessUrl: `/video/${purchaseData.itemId}`,
              downloadUrl: videoData?.url || "",
              contentDetails: {
                duration: videoData?.duration || 0,
                format: "mp4",
                quality: "HD",
              },
            })
          }
        }
      } catch (error) {
        console.error(`❌ [User Purchases] Error processing video purchase ${doc.id}:`, error)
      }
    }

    // Process product box purchases
    for (const doc of productBoxPurchases.docs) {
      const purchaseData = doc.data()

      try {
        // Get product box details
        const productBoxDoc = await db
          .collection("productBoxes")
          .doc(purchaseData.itemId || purchaseData.productBoxId)
          .get()
        if (productBoxDoc.exists()) {
          const productBoxData = productBoxDoc.data()

          // Get creator details
          let creatorDetails = null
          if (productBoxData?.creatorId) {
            const creatorDoc = await db.collection("users").doc(productBoxData.creatorId).get()
            if (creatorDoc.exists()) {
              const creatorData = creatorDoc.data()
              creatorDetails = {
                name: creatorData?.displayName || creatorData?.username || "Unknown Creator",
                username: creatorData?.username || "",
              }
            }
          }

          if (creatorDetails) {
            purchases.push({
              id: doc.id,
              type: "product_box",
              itemId: purchaseData.itemId || purchaseData.productBoxId,
              itemTitle: productBoxData?.title || "Unknown Bundle",
              itemDescription: productBoxData?.description || "",
              creatorName: creatorDetails.name,
              creatorUsername: creatorDetails.username,
              price: purchaseData.amount || 0,
              currency: purchaseData.currency || "usd",
              purchasedAt: purchaseData.createdAt,
              status: purchaseData.status || "completed",
              thumbnailUrl: productBoxData?.coverImage || "",
              accessUrl: `/product-box/${purchaseData.itemId || purchaseData.productBoxId}/content`,
              downloadUrl: null,
              contentItems: productBoxData?.contentItems || [],
              contentDetails: {
                itemCount: productBoxData?.contentItems?.length || 0,
                type: productBoxData?.type || "bundle",
              },
            })
          }
        }
      } catch (error) {
        console.error(`❌ [User Purchases] Error processing product box purchase ${doc.id}:`, error)
      }
    }

    // Sort all purchases by date (newest first)
    purchases.sort((a, b) => {
      const dateA = a.purchasedAt?.toDate?.() || new Date(a.purchasedAt)
      const dateB = b.purchasedAt?.toDate?.() || new Date(b.purchasedAt)
      return dateB.getTime() - dateA.getTime()
    })

    console.log(`✅ [User Purchases] Loaded ${purchases.length} purchases`)

    return NextResponse.json({
      success: true,
      purchases,
      total: purchases.length,
    })
  } catch (error) {
    console.error("❌ [User Purchases] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
