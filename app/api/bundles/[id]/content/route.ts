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

    // Check if user has purchased this bundle and get purchase details
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

    // Get the purchase data which contains all the content information
    const purchaseDoc = purchaseSnapshot.docs[0]
    const purchaseData = purchaseDoc.data()

    console.log(`✅ [Bundle Content API] Found purchase:`, purchaseDoc.id)
    console.log(`📦 [Bundle Content API] Purchase data keys:`, Object.keys(purchaseData))

    // Extract content from the purchase data
    let contents: any[] = []

    // Check various possible fields where content might be stored
    if (purchaseData.contents && Array.isArray(purchaseData.contents)) {
      contents = purchaseData.contents
      console.log(`📁 [Bundle Content API] Found ${contents.length} items in contents field`)
    } else if (purchaseData.items && Array.isArray(purchaseData.items)) {
      contents = purchaseData.items
      console.log(`📁 [Bundle Content API] Found ${contents.length} items in items field`)
    } else if (purchaseData.bundleContents && Array.isArray(purchaseData.bundleContents)) {
      contents = purchaseData.bundleContents
      console.log(`📁 [Bundle Content API] Found ${contents.length} items in bundleContents field`)
    } else if (purchaseData.contentItems && Array.isArray(purchaseData.contentItems)) {
      contents = purchaseData.contentItems
      console.log(`📁 [Bundle Content API] Found ${contents.length} items in contentItems field`)
    } else {
      console.log(`⚠️ [Bundle Content API] No content array found in purchase data`)
      console.log(`📋 [Bundle Content API] Available fields:`, Object.keys(purchaseData))
    }

    // Get creator information
    let creatorName = "Unknown Creator"
    if (purchaseData.creatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(purchaseData.creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()
          creatorName = creatorData?.username || creatorData?.displayName || creatorData?.name || "Unknown Creator"
        }
      } catch (error) {
        console.warn(`⚠️ [Bundle Content API] Could not fetch creator info:`, error)
      }
    }

    // Use creator name from purchase data if available
    if (purchaseData.creatorUsername) {
      creatorName = purchaseData.creatorUsername
    } else if (purchaseData.creatorName) {
      creatorName = purchaseData.creatorName
    }

    const bundle = {
      id: bundleId,
      title: purchaseData.bundleTitle || purchaseData.title || "Untitled Bundle",
      description: purchaseData.bundleDescription || purchaseData.description || "",
      price: purchaseData.amount ? purchaseData.amount / 100 : 0, // Convert from cents
      creatorId: purchaseData.creatorId || "",
      creatorName,
      thumbnailUrl: purchaseData.bundleThumbnail || purchaseData.thumbnailUrl || null,
      contents: contents.map((item: any, index: number) => ({
        id: item.id || item.contentId || `item-${index}`,
        title: item.title || item.name || `Content Item ${index + 1}`,
        description: item.description || "",
        type: item.type || item.contentType || "file",
        size: item.size || item.fileSize || 0,
        url: item.url || item.downloadUrl || item.contentUrl || null,
        thumbnailUrl: item.thumbnailUrl || item.thumbnail || null,
        createdAt: item.createdAt || null,
        // Include any additional metadata
        metadata: item.metadata || {},
        // Include original item data for debugging
        originalData: item,
      })),
      totalSize: purchaseData.totalSize || 0,
      contentCount: contents.length,
      createdAt: purchaseData.createdAt || null,
      purchaseId: purchaseDoc.id,
      purchaseData: purchaseData, // Include for debugging
    }

    console.log(`✅ [Bundle Content API] Returning bundle with ${contents.length} items`)
    console.log(`📊 [Bundle Content API] Content preview:`, contents.slice(0, 2))

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
