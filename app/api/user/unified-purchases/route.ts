import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Unified Purchases] Starting fetch...")

    // Get auth token from header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ [Unified Purchases] Missing or invalid authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.replace("Bearer ", "")
    let userId: string

    try {
      const decodedToken = await auth.verifyIdToken(idToken)
      userId = decodedToken.uid
      console.log("✅ [Unified Purchases] User authenticated:", userId)
    } catch (error) {
      console.error("❌ [Unified Purchases] Error verifying ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    // Fetch purchases from user's purchases subcollection
    const purchasesSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .orderBy("timestamp", "desc")
      .get()

    console.log(`📊 [Unified Purchases] Found ${purchasesSnapshot.docs.length} purchases`)

    const purchases = []
    const errors = []

    for (const purchaseDoc of purchasesSnapshot.docs) {
      try {
        const purchaseData = purchaseDoc.data()

        // Get product box details
        let productBoxData = null
        if (purchaseData.productBoxId) {
          try {
            const productBoxDoc = await db.collection("productBoxes").doc(purchaseData.productBoxId).get()
            if (productBoxDoc.exists) {
              productBoxData = productBoxDoc.data()
            }
          } catch (productBoxError) {
            console.error(
              `⚠️ [Unified Purchases] Error fetching product box ${purchaseData.productBoxId}:`,
              productBoxError,
            )
          }
        }

        // Get creator details
        let creatorData = null
        const creatorId = purchaseData.creatorId || productBoxData?.creatorId
        if (creatorId) {
          try {
            const creatorDoc = await db.collection("users").doc(creatorId).get()
            if (creatorDoc.exists) {
              creatorData = creatorDoc.data()
            }
          } catch (creatorError) {
            console.error(`⚠️ [Unified Purchases] Error fetching creator ${creatorId}:`, creatorError)
          }
        }

        // Build purchase object
        const purchase = {
          id: purchaseDoc.id,
          type: "product_box",
          itemId: purchaseData.productBoxId || "",
          itemTitle: productBoxData?.title || purchaseData.title || "Unknown Product",
          itemDescription: productBoxData?.description || purchaseData.description || "",
          amount: purchaseData.amount || 0,
          currency: purchaseData.currency || "usd",
          purchasedAt: purchaseData.timestamp?.toDate() || new Date(),
          status: purchaseData.status || "completed",
          thumbnailUrl: productBoxData?.thumbnailUrl || purchaseData.thumbnailUrl || "",
          creatorUsername: creatorData?.username || purchaseData.creatorUsername || "",
          creatorName: creatorData?.displayName || creatorData?.name || purchaseData.creatorName || "Unknown Creator",
          sessionId: purchaseData.sessionId || "",
          downloadCount: purchaseData.downloadCount || 0,
          lastDownloaded: purchaseData.lastDownloaded?.toDate() || null,
          tags: purchaseData.tags || [],
          stripeMode: purchaseData.stripeMode || "unknown",
          metadata: {
            productBoxId: purchaseData.productBoxId,
            creatorId: creatorId,
            paymentIntentId: purchaseData.paymentIntentId,
            sessionCreated: purchaseData.sessionCreated?.toDate() || null,
            sessionExpires: purchaseData.sessionExpires?.toDate() || null,
          },
        }

        purchases.push(purchase)
      } catch (error) {
        console.error(`⚠️ [Unified Purchases] Error processing purchase ${purchaseDoc.id}:`, error)
        errors.push({
          purchaseId: purchaseDoc.id,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Calculate stats
    const totalPurchases = purchases.length
    const totalSpent = purchases.reduce((sum, p) => sum + p.amount, 0)
    const currency = purchases.length > 0 ? purchases[0].currency : "usd"

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonth = purchases.filter((p) => p.purchasedAt >= thisMonthStart).length

    const lastDownload = purchases
      .filter((p) => p.lastDownloaded)
      .sort((a, b) => (b.lastDownloaded?.getTime() || 0) - (a.lastDownloaded?.getTime() || 0))[0]?.lastDownloaded

    const stats = {
      totalPurchases,
      totalSpent,
      currency,
      thisMonth,
      lastDownload,
    }

    console.log(`✅ [Unified Purchases] Returning ${purchases.length} purchases with ${errors.length} errors`)

    return NextResponse.json({
      success: true,
      purchases,
      stats,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("❌ [Unified Purchases] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
