import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`🔍 [Unified Purchases] Fetching purchases for user: ${userId}`)

    // Query bundlePurchases collection
    let purchasesSnapshot
    try {
      // Try with ordering first
      purchasesSnapshot = await db
        .collection("bundlePurchases")
        .where("buyerUid", "==", userId)
        .orderBy("createdAt", "desc")
        .get()
    } catch (indexError) {
      console.warn("⚠️ [Unified Purchases] Index missing, using simple query")
      // Fallback to simple query
      purchasesSnapshot = await db.collection("bundlePurchases").where("buyerUid", "==", userId).get()
    }

    const purchases: any[] = []

    for (const doc of purchasesSnapshot.docs) {
      const data = doc.data()
      console.log(`📦 [Unified Purchases] Processing purchase: ${doc.id}`)

      // Extract all data from the bundlePurchases document
      const purchase = {
        id: doc.id,
        sessionId: data.sessionId || doc.id,

        // Bundle/Product info from the purchase document itself
        title: data.bundleTitle || data.title || "Untitled Purchase",
        description: data.bundleDescription || data.description || "",
        bundleId: data.bundleId || null,
        productBoxId: data.productBoxId || null,
        itemId: data.itemId || data.bundleId || data.productBoxId,
        type: data.bundleId ? "bundle" : "product_box",

        // Creator info from purchase document
        creatorId: data.creatorId || "",
        creatorName: data.creatorName || "Unknown Creator",
        creatorUsername: data.creatorUsername || data.creatorName || "Unknown",

        // Purchase details
        amount: data.amount || 0,
        price: (data.amount || 0) / 100, // Convert cents to dollars
        currency: data.currency || "usd",
        status: data.status || "completed",

        // Dates
        createdAt: data.createdAt || data.purchasedAt || new Date(),
        updatedAt: data.updatedAt || data.createdAt || new Date(),
        purchasedAt: data.purchasedAt || data.createdAt || new Date(),

        // Content info from purchase document
        contentCount: data.contentCount || data.totalItems || 0,
        totalItems: data.totalItems || data.contentCount || 0,
        totalSize: data.totalSize || 0,

        // Thumbnails and media
        thumbnailUrl: data.bundleThumbnail || data.thumbnailUrl || "",

        // Access info
        accessUrl: data.accessUrl || `/bundles/${data.bundleId || data.itemId}`,
        accessGranted: data.accessGranted !== false,

        // Contents array from purchase document
        contents: data.contents || [],
        items: data.items || data.contents || [],
        itemNames: data.itemNames || [],

        // User info
        buyerUid: data.buyerUid,
        userEmail: data.userEmail || "",
        userName: data.userName || "",

        // System info
        environment: data.environment || "unknown",
        webhookProcessed: data.webhookProcessed || false,
        source: "bundlePurchases",

        // Metadata object for compatibility
        metadata: {
          title: data.bundleTitle || data.title,
          description: data.bundleDescription || data.description,
          contentCount: data.contentCount || data.totalItems || 0,
          thumbnailUrl: data.bundleThumbnail || data.thumbnailUrl || "",
          totalSize: data.totalSize || 0,
          itemNames: data.itemNames || [],
        },
      }

      purchases.push(purchase)
    }

    // Sort manually if we used simple query
    if (purchases.length > 0) {
      purchases.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()
        return bTime - aTime // Newest first
      })
    }

    console.log(`✅ [Unified Purchases] Found ${purchases.length} purchases`)

    return NextResponse.json({
      success: true,
      purchases,
      total: purchases.length,
      debug: {
        userId,
        totalFound: purchases.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error("❌ [Unified Purchases] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch purchases",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
