import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id
    console.log(`🔍 [Bundle Content API] Fetching content for bundle: ${bundleId}`)

    // Get auth token
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`🔍 [Bundle Content API] User: ${userId}`)

    // Check if user has purchased this bundle
    let purchaseDoc = null
    let purchaseData = null

    try {
      // Try to find purchase by bundleId and buyerUid
      const purchaseQuery = await db
        .collection("bundlePurchases")
        .where("bundleId", "==", bundleId)
        .where("buyerUid", "==", userId)
        .limit(1)
        .get()

      if (!purchaseQuery.empty) {
        purchaseDoc = purchaseQuery.docs[0]
        purchaseData = purchaseDoc.data()
        console.log(`✅ [Bundle Content API] Found purchase record:`, {
          id: purchaseDoc.id,
          bundleTitle: purchaseData.bundleTitle,
          bundleThumbnail: purchaseData.bundleThumbnail,
          bundlePrice: purchaseData.bundlePrice,
          purchaseAmount: purchaseData.purchaseAmount
        })
      } else {
        console.log(`❌ [Bundle Content API] No purchase found for bundle ${bundleId} and user ${userId}`)
        return NextResponse.json(
          { 
            error: "Access denied", 
            message: "You don't have access to this bundle. Please purchase it first.",
            bundleId,
            userId 
          }, 
          { status: 403 }
        )
      }
    } catch (error) {
      console.error(`❌ [Bundle Content API] Error checking purchase:`, error)
      return NextResponse.json(
        { error: "Failed to verify purchase" },
        { status: 500 }
      )
    }

    // Get bundle data
    let bundleData = null
    try {
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()
      if (bundleDoc.exists) {
        bundleData = bundleDoc.data()
        console.log(`✅ [Bundle Content API] Found bundle data:`, {
          title: bundleData?.title,
          thumbnailUrl: bundleData?.thumbnailUrl,
          bundleThumbnailUrl: bundleData?.bundleThumbnailUrl
        })
      }
    } catch (error) {
      console.warn(`⚠️ [Bundle Content API] Could not fetch bundle data:`, error)
    }

    // Get bundle contents from purchase record or bundle document
    let contents = []
    
    if (purchaseData?.bundleContent && Array.isArray(purchaseData.bundleContent)) {
      contents = purchaseData.bundleContent
      console.log(`✅ [Bundle Content API] Using bundleContent from purchase: ${contents.length} items`)
    } else if (purchaseData?.contents && Array.isArray(purchaseData.contents)) {
      contents = purchaseData.contents
      console.log(`✅ [Bundle Content API] Using contents from purchase: ${contents.length} items`)
    } else if (bundleData?.contents && Array.isArray(bundleData.contents)) {
      contents = bundleData.contents
      console.log(`✅ [Bundle Content API] Using contents from bundle: ${contents.length} items`)
    } else {
      console.warn(`⚠️ [Bundle Content API] No contents found in purchase or bundle data`)
    }

    // Determine the best thumbnail source with priority
    let bundleThumbnailUrl = null
    
    // Priority 1: bundleThumbnail from purchase record
    if (purchaseData?.bundleThumbnail) {
      bundleThumbnailUrl = purchaseData.bundleThumbnail
      console.log(`🖼️ [Bundle Content API] Using bundleThumbnail from purchase: ${bundleThumbnailUrl}`)
    }
    // Priority 2: thumbnailUrl from bundle data
    else if (bundleData?.thumbnailUrl) {
      bundleThumbnailUrl = bundleData.thumbnailUrl
      console.log(`🖼️ [Bundle Content API] Using thumbnailUrl from bundle: ${bundleThumbnailUrl}`)
    }
    // Priority 3: bundleThumbnailUrl from bundle data
    else if (bundleData?.bundleThumbnailUrl) {
      bundleThumbnailUrl = bundleData.bundleThumbnailUrl
      console.log(`🖼️ [Bundle Content API] Using bundleThumbnailUrl from bundle: ${bundleThumbnailUrl}`)
    }
    // Priority 4: First content item thumbnail
    else if (contents.length > 0 && contents[0].thumbnailUrl) {
      bundleThumbnailUrl = contents[0].thumbnailUrl
      console.log(`🖼️ [Bundle Content API] Using first content thumbnail: ${bundleThumbnailUrl}`)
    }

    // Prepare response data
    const responseData = {
      success: true,
      bundleId,
      bundle: {
        id: bundleId,
        title: purchaseData?.bundleTitle || bundleData?.title || "Untitled Bundle",
        description: purchaseData?.description || bundleData?.description || "",
        thumbnailUrl: bundleThumbnailUrl,
        bundleThumbnailUrl: bundleData?.bundleThumbnailUrl,
        creatorId: purchaseData?.creatorId || bundleData?.creatorId,
        creatorUsername: purchaseData?.creatorUsername || bundleData?.creatorUsername || "Unknown Creator",
        contentCount: contents.length,
        price: bundleData?.price,
      },
      contents: contents.map((content: any) => ({
        id: content.id || content.videoId,
        title: content.title || content.name || "Untitled",
        description: content.description || "",
        thumbnailUrl: content.thumbnailUrl || content.thumbnail,
        videoUrl: content.videoUrl || content.url,
        downloadUrl: content.downloadUrl || content.url,
        duration: content.duration,
        size: content.size || content.fileSize,
        type: content.type || "video",
      })),
      // Include purchase data for price and thumbnail
      bundleTitle: purchaseData?.bundleTitle,
      bundleThumbnail: purchaseData?.bundleThumbnail,
      bundlePrice: purchaseData?.bundlePrice,
      purchaseAmount: purchaseData?.purchaseAmount,
      description: purchaseData?.description,
      creatorId: purchaseData?.creatorId,
      creatorUsername: purchaseData?.creatorUsername,
      purchaseId: purchaseDoc?.id,
    }

    console.log(`✅ [Bundle Content API] Returning bundle content:`, {
      bundleId,
      title: responseData.bundle.title,
      thumbnailUrl: responseData.bundle.thumbnailUrl,
      contentCount: responseData.contents.length,
      bundlePrice: responseData.bundlePrice,
      bundleThumbnail: responseData.bundleThumbnail
    })

    return NextResponse.json(responseData)

  } catch (error: any) {
    console.error(`❌ [Bundle Content API] Error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch bundle content",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
