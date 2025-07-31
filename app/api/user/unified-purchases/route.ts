import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-server"
import { verifyIdTokenFromRequest } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    console.log("🛒 [Unified Purchases] Fetching user purchases...")

    // REQUIRE authentication
    const decodedToken = await verifyIdTokenFromRequest(request)
    if (!decodedToken) {
      console.error("❌ [Unified Purchases] Authentication required")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("👤 [Unified Purchases] Authenticated user:", userId)

    const db = getAdminDb()

    // Fetch all purchases for the authenticated user
    console.log("🔍 [Unified Purchases] Querying purchases for user:", userId)
    const purchasesQuery = await db
      .collection("purchases")
      .where("buyerUid", "==", userId) // Only get user's own purchases
      .orderBy("createdAt", "desc")
      .get()

    console.log(`📦 [Unified Purchases] Found ${purchasesQuery.docs.length} purchases`)

    const purchases = []

    for (const doc of purchasesQuery.docs) {
      const purchaseData = doc.data()
      console.log(`📋 [Unified Purchases] Processing purchase:`, {
        id: doc.id,
        bundleId: purchaseData.bundleId,
        itemType: purchaseData.itemType,
        amount: purchaseData.amount,
        status: purchaseData.status,
      })

      // Get bundle/item details
      let itemDetails = null
      if (purchaseData.bundleId) {
        try {
          const bundleDoc = await db.collection("bundles").doc(purchaseData.bundleId).get()
          if (bundleDoc.exists) {
            const bundleData = bundleDoc.data()!
            itemDetails = {
              id: purchaseData.bundleId,
              title: bundleData.title || "Untitled Bundle",
              description: bundleData.description || "",
              thumbnailUrl: bundleData.thumbnailUrl || "",
              downloadUrl: bundleData.downloadUrl || bundleData.fileUrl || "",
              fileSize: bundleData.fileSize || 0,
              duration: bundleData.duration || 0,
              fileType: bundleData.fileType || "",
              tags: bundleData.tags || [],
              type: "bundle",
            }
          }
        } catch (error) {
          console.error(`❌ [Unified Purchases] Failed to fetch bundle ${purchaseData.bundleId}:`, error)
        }
      }

      // Get creator details
      let creatorDetails = null
      if (purchaseData.creatorId) {
        try {
          const creatorDoc = await db.collection("users").doc(purchaseData.creatorId).get()
          if (creatorDoc.exists) {
            const creatorData = creatorDoc.data()!
            creatorDetails = {
              id: purchaseData.creatorId,
              name: creatorData.displayName || creatorData.name || "Unknown Creator",
              username: creatorData.username || "",
              profilePicture: creatorData.profilePicture || "",
            }
          }
        } catch (error) {
          console.error(`❌ [Unified Purchases] Failed to fetch creator ${purchaseData.creatorId}:`, error)
        }
      }

      // Build unified purchase object
      const unifiedPurchase = {
        id: doc.id,
        sessionId: purchaseData.sessionId,
        itemId: purchaseData.bundleId || purchaseData.itemId,
        itemType: purchaseData.itemType || "bundle",
        buyerUid: purchaseData.buyerUid, // Always include verified buyer UID
        creatorId: purchaseData.creatorId,
        amount: purchaseData.amount || 0,
        currency: purchaseData.currency || "usd",
        status: purchaseData.status || "completed",
        paymentStatus: purchaseData.paymentStatus || "paid",
        purchasedAt: purchaseData.createdAt || purchaseData.purchasedAt,
        verificationMethod: purchaseData.verificationMethod || "webhook",
        verified: true, // All purchases in this endpoint are verified

        // Item details
        item: itemDetails || {
          id: purchaseData.bundleId || purchaseData.itemId,
          title: purchaseData.bundleTitle || "Unknown Item",
          description: "",
          thumbnailUrl: "",
          downloadUrl: "",
          type: purchaseData.itemType || "bundle",
        },

        // Creator details
        creator: creatorDetails || {
          id: purchaseData.creatorId,
          name: purchaseData.creatorName || "Unknown Creator",
          username: "",
          profilePicture: "",
        },

        // Additional metadata
        customerEmail: purchaseData.customerEmail || purchaseData.buyerEmail,
        connectedAccountId: purchaseData.connectedAccountId,
        platform: "massclip",
      }

      purchases.push(unifiedPurchase)
    }

    console.log(`✅ [Unified Purchases] Returning ${purchases.length} verified purchases`)

    return NextResponse.json({
      success: true,
      purchases,
      total: purchases.length,
      userId,
      verified: true,
    })
  } catch (error: any) {
    console.error("❌ [Unified Purchases] Failed to fetch purchases:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
