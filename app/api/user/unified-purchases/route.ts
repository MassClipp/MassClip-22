import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
  try {
    console.log("🛒 [Unified Purchases] Starting fetch...")

    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log("❌ [Unified Purchases] No authenticated user")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userId = session.user.email
    console.log(`👤 [Unified Purchases] Fetching purchases for user: ${userId}`)

    // Query all purchases for this user
    const purchasesQuery = adminDb
      .collection("purchases")
      .where("userId", "==", userId)
      .where("status", "==", "completed")
      .orderBy("createdAt", "desc")

    const purchasesSnapshot = await purchasesQuery.get()
    console.log(`📦 [Unified Purchases] Found ${purchasesSnapshot.size} completed purchases`)

    if (purchasesSnapshot.empty) {
      console.log("ℹ️ [Unified Purchases] No purchases found for user")
      return NextResponse.json({
        purchases: [],
        total: 0,
        message: "No purchases found",
      })
    }

    // Process purchases and enrich with additional data
    const purchases = []

    for (const doc of purchasesSnapshot.docs) {
      const purchaseData = doc.data()
      console.log(`📄 [Unified Purchases] Processing purchase: ${doc.id}`, {
        type: purchaseData.type,
        productBoxId: purchaseData.productBoxId,
        bundleId: purchaseData.bundleId,
        title: purchaseData.title,
      })

      // Get creator username
      let creatorUsername = "Unknown Creator"
      if (purchaseData.creatorId) {
        try {
          const creatorDoc = await adminDb.collection("users").doc(purchaseData.creatorId).get()
          if (creatorDoc.exists) {
            const creatorData = creatorDoc.data()
            creatorUsername = creatorData?.username || creatorData?.displayName || "Unknown Creator"
          }
        } catch (error) {
          console.warn(`⚠️ [Unified Purchases] Could not fetch creator data for ${purchaseData.creatorId}:`, error)
        }
      }

      // Enrich purchase data
      const enrichedPurchase = {
        id: doc.id,
        title: purchaseData.title || purchaseData.metadata?.title || "Untitled Purchase",
        description: purchaseData.description || purchaseData.metadata?.description || "",
        price: purchaseData.price || 0,
        currency: purchaseData.currency || "usd",
        status: purchaseData.status || "completed",
        createdAt: purchaseData.createdAt?.toDate?.() || purchaseData.createdAt || new Date(),
        updatedAt: purchaseData.updatedAt?.toDate?.() || purchaseData.updatedAt || new Date(),
        productBoxId: purchaseData.productBoxId || null,
        bundleId: purchaseData.bundleId || null,
        creatorId: purchaseData.creatorId || "",
        creatorUsername: creatorUsername,
        type: purchaseData.type || "product_box",
        downloadUrl: purchaseData.downloadUrl || "",
        thumbnailUrl: purchaseData.thumbnailUrl || purchaseData.metadata?.thumbnailUrl || "",
        isFavorite: purchaseData.isFavorite || false,
        rating: purchaseData.rating || 0,
        downloadProgress: purchaseData.downloadProgress || 0,
        lastAccessed: purchaseData.lastAccessed?.toDate?.() || null,
        metadata: {
          title: purchaseData.metadata?.title || purchaseData.title,
          description: purchaseData.metadata?.description || purchaseData.description,
          contentCount: purchaseData.metadata?.contentCount || 0,
          thumbnailUrl: purchaseData.metadata?.thumbnailUrl || purchaseData.thumbnailUrl || "",
          duration: purchaseData.metadata?.duration || 0,
          fileSize: purchaseData.metadata?.fileSize || "Unknown",
          contentType: purchaseData.metadata?.contentType || "video",
          ...purchaseData.metadata,
        },
      }

      purchases.push(enrichedPurchase)
    }

    console.log(`✅ [Unified Purchases] Returning ${purchases.length} enriched purchases`)

    return NextResponse.json({
      purchases,
      total: purchases.length,
      totalValue: purchases.reduce((sum, p) => sum + (p.price || 0), 0),
    })
  } catch (error) {
    console.error("❌ [Unified Purchases] Error fetching purchases:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
