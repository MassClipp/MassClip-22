import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid
    const bundleId = params.id

    console.log(`🔍 [Bundle Content API] User ${userId} requesting bundle ${bundleId}`)

    // Check if user has purchased this bundle
    const purchaseQuery = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", userId)
      .where("bundleId", "==", bundleId)
      .where("status", "==", "completed")
      .get()

    if (purchaseQuery.empty) {
      console.log(`❌ [Bundle Content API] User ${userId} has not purchased bundle ${bundleId}`)
      return NextResponse.json({ error: "Access denied. Bundle not purchased." }, { status: 403 })
    }

    // Get bundle details
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    const purchaseData = purchaseQuery.docs[0].data()

    // Get creator info
    let creatorUsername = "Unknown Creator"
    if (bundleData?.creatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()
          creatorUsername = creatorData?.username || creatorData?.displayName || creatorData?.name || "Unknown Creator"
        }
      } catch (error) {
        console.warn(`⚠️ [Bundle Content API] Could not fetch creator info:`, error)
      }
    }

    const bundle = {
      id: bundleId,
      title: bundleData?.title || purchaseData.bundleTitle || "Untitled Bundle",
      description: bundleData?.description || purchaseData.description || "",
      thumbnailUrl: bundleData?.thumbnailUrl || purchaseData.bundleThumbnail || "",
      creatorId: bundleData?.creatorId || purchaseData.creatorId || "",
      creatorUsername,
      items: purchaseData.contents || bundleData?.items || [],
      totalItems: purchaseData.contentCount || bundleData?.totalItems || 0,
      totalSize: purchaseData.totalSize || bundleData?.totalSize || 0,
      price: purchaseData.amount || bundleData?.price || 0,
      currency: purchaseData.currency || "usd",
    }

    console.log(`✅ [Bundle Content API] Returning bundle content for ${bundleId}`)

    return NextResponse.json({
      success: true,
      bundle,
    })
  } catch (error: any) {
    console.error("❌ [Bundle Content API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle content",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
