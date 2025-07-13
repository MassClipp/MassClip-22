import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productBoxId = params.id

    console.log(`🔍 [Content API] Fetching content for bundle: ${productBoxId}`)

    // Verify authentication
    let userId = null
    try {
      const authHeader = request.headers.get("authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const idToken = authHeader.split("Bearer ")[1]
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log(`✅ [Content API] Authenticated user: ${userId}`)
      }
    } catch (authError) {
      console.warn(`⚠️ [Content API] Auth verification failed:`, authError)
    }

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Check if user has access to this bundle
    const purchasesQuery = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", userId)
      .where("bundleId", "==", productBoxId)
      .get()

    if (purchasesQuery.empty) {
      console.log(`❌ [Content API] No purchase found for user ${userId} and bundle ${productBoxId}`)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    console.log(`✅ [Content API] Access verified for user ${userId}`)

    // Get bundle data to fetch content with proper titles
    const bundleDoc = await db.collection("bundles").doc(productBoxId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    let contentItems: any[] = []

    // Get content from bundle with proper titles
    if (bundleData.contents && Array.isArray(bundleData.contents)) {
      contentItems = bundleData.contents.map((item: any) => ({
        ...item,
        // Ensure we use the proper title from the bundle
        title: item.title || item.name || item.originalTitle || "Untitled Content",
        displayTitle: item.title || item.name || item.originalTitle || "Untitled Content",
        originalTitle: item.title || item.name || item.originalTitle,
        filename: item.filename || item.title || "content",
      }))
    } else if (bundleData.items && Array.isArray(bundleData.items)) {
      contentItems = bundleData.items.map((item: any) => ({
        ...item,
        title: item.title || item.name || item.originalTitle || "Untitled Content",
        displayTitle: item.title || item.name || item.originalTitle || "Untitled Content",
        originalTitle: item.title || item.name || item.originalTitle,
        filename: item.filename || item.title || "content",
      }))
    } else if (bundleData.contentItems && Array.isArray(bundleData.contentItems)) {
      // Fetch content details from productBoxContent collection
      const contentPromises = bundleData.contentItems.map(async (itemId: string) => {
        try {
          const contentDoc = await db.collection("productBoxContent").doc(itemId).get()
          if (contentDoc.exists) {
            const contentData = contentDoc.data()!
            return {
              id: itemId,
              title: contentData.title || contentData.name || contentData.originalTitle || "Untitled Content",
              displayTitle: contentData.title || contentData.name || contentData.originalTitle || "Untitled Content",
              originalTitle: contentData.title || contentData.name || contentData.originalTitle,
              fileUrl: contentData.fileUrl,
              thumbnailUrl: contentData.thumbnailUrl,
              fileSize: contentData.fileSize || 0,
              duration: contentData.duration,
              contentType: contentData.contentType || "video",
              mimeType: contentData.mimeType,
              filename: contentData.filename || contentData.title || "content",
            }
          }
          return null
        } catch (error) {
          console.warn(`⚠️ [Content API] Error fetching content item ${itemId}:`, error)
          return null
        }
      })

      const resolvedContents = await Promise.all(contentPromises)
      contentItems = resolvedContents.filter((item) => item !== null)
    }

    console.log(`✅ [Content API] Returning ${contentItems.length} content items with proper titles`)

    return NextResponse.json(contentItems)
  } catch (error: any) {
    console.error(`❌ [Content API] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch content",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
