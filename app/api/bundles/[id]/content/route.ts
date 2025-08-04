import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id

    // Get auth token
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`🔍 [Bundle Content API] User ${userId} requesting bundle ${bundleId}`)

    // Check if user has purchased this bundle
    const purchaseSnapshot = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", userId)
      .where("bundleId", "==", bundleId)
      .where("status", "==", "completed")
      .get()

    if (purchaseSnapshot.empty) {
      console.log(`❌ [Bundle Content API] User ${userId} has not purchased bundle ${bundleId}`)
      return NextResponse.json({ error: "Access denied. You must purchase this bundle first." }, { status: 403 })
    }

    // Get bundle information
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    console.log(`✅ [Bundle Content API] Found bundle:`, bundleData?.title)

    // Get creator information
    let creatorName = "Unknown Creator"
    if (bundleData?.creatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()
          creatorName = creatorData?.username || creatorData?.displayName || creatorData?.name || "Unknown Creator"
        }
      } catch (error) {
        console.warn(`⚠️ [Bundle Content API] Could not fetch creator info:`, error)
      }
    }

    // Get bundle contents
    let contents: any[] = []
    if (bundleData?.contents && Array.isArray(bundleData.contents)) {
      contents = bundleData.contents
    } else {
      // Try to get contents from a separate collection if they exist
      try {
        const contentsSnapshot = await db.collection("bundleContents").where("bundleId", "==", bundleId).get()

        contents = contentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      } catch (error) {
        console.warn(`⚠️ [Bundle Content API] Could not fetch bundle contents:`, error)
      }
    }

    const bundle = {
      id: bundleId,
      title: bundleData?.title || "Untitled Bundle",
      description: bundleData?.description || "",
      price: bundleData?.price || 0,
      creatorId: bundleData?.creatorId || "",
      creatorName,
      thumbnailUrl: bundleData?.thumbnailUrl || null,
      contents,
      totalSize: bundleData?.totalSize || 0,
      contentCount: contents.length,
      createdAt: bundleData?.createdAt || null,
    }

    console.log(`✅ [Bundle Content API] Returning bundle with ${contents.length} items`)

    return NextResponse.json({
      success: true,
      bundle,
      hasAccess: true,
    })
  } catch (error: any) {
    console.error("❌ [Bundle Content API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch bundle content",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
