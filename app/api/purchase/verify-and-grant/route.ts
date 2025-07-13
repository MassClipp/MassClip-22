import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, creatorId } = await request.json()

    console.log(`🔍 [Verify & Grant] Received request:`, {
      productBoxId,
      creatorId,
    })

    if (!productBoxId) {
      return NextResponse.json({ error: "Product Box ID is required" }, { status: 400 })
    }

    // Get authenticated user ID from Authorization header - CRITICAL FIX
    let userId = null
    let userEmail = ""
    let isAuthenticated = false

    try {
      const authHeader = request.headers.get("authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const idToken = authHeader.split("Bearer ")[1]
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid // This is the actual Firebase UID
        userEmail = decodedToken.email || ""
        isAuthenticated = true
        console.log(`✅ [Verify & Grant] Authenticated user UID: ${userId} (${userEmail})`)
      } else {
        console.log(`⚠️ [Verify & Grant] No authentication provided`)
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }
    } catch (authError) {
      console.error(`❌ [Verify & Grant] Auth verification failed:`, authError)
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    // Require authentication - don't allow anonymous purchases
    if (!userId || !isAuthenticated) {
      return NextResponse.json({ error: "User must be authenticated" }, { status: 401 })
    }

    console.log(`🔍 [Verify & Grant] Looking for bundle: ${productBoxId}`)

    // Get bundle from bundles collection
    const bundleDoc = await db.collection("bundles").doc(productBoxId).get()

    if (!bundleDoc.exists) {
      console.error(`❌ [Verify & Grant] Bundle not found in bundles collection: ${productBoxId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log(`✅ [Verify & Grant] Found bundle:`, {
      id: productBoxId,
      title: bundleData?.title,
      creatorId: bundleData?.creatorId,
      price: bundleData?.price,
    })

    // Get creator details
    let creatorData: any = { name: "Unknown Creator", username: "unknown" }
    const creatorIdToUse = creatorId || bundleData.creatorId

    if (creatorIdToUse) {
      try {
        const creatorDoc = await db.collection("users").doc(creatorIdToUse).get()
        if (creatorDoc.exists) {
          const creator = creatorDoc.data()!
          creatorData = {
            name: creator.displayName || creator.name || creator.username || "Unknown Creator",
            username: creator.username || "unknown",
          }
          console.log(`✅ [Verify & Grant] Creator found:`, creatorData)
        }
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Error fetching creator:`, error)
      }
    }

    // Get actual bundle contents with proper titles from bundles collection
    let bundleContents: any[] = []
    let totalSize = 0
    let contentCount = 0

    try {
      // Get content from the bundle's contents array with proper titles
      if (bundleData.contents && Array.isArray(bundleData.contents)) {
        bundleContents = bundleData.contents.map((item: any) => ({
          ...item,
          // Use the title from the bundle contents, not generic names
          title: item.title || item.name || item.originalTitle || "Untitled Content",
          displayTitle: item.title || item.name || item.originalTitle || "Untitled Content",
          originalTitle: item.title || item.name || item.originalTitle,
        }))
        contentCount = bundleContents.length
        totalSize = bundleContents.reduce((sum, item) => sum + (item.fileSize || 0), 0)
        console.log(`✅ [Verify & Grant] Found ${contentCount} items in bundle contents with proper titles`)
      } else if (bundleData.items && Array.isArray(bundleData.items)) {
        bundleContents = bundleData.items.map((item: any) => ({
          ...item,
          title: item.title || item.name || item.originalTitle || "Untitled Content",
          displayTitle: item.title || item.name || item.originalTitle || "Untitled Content",
          originalTitle: item.title || item.name || item.originalTitle,
        }))
        contentCount = bundleContents.length
        totalSize = bundleContents.reduce((sum, item) => sum + (item.fileSize || 0), 0)
        console.log(`✅ [Verify & Grant] Found ${contentCount} items in bundle items with proper titles`)
      } else if (bundleData.contentItems && Array.isArray(bundleData.contentItems)) {
        // If we have content item IDs, try to fetch the actual content details
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
                fileUrl: contentData.fileUrl || `/api/content/download/${itemId}`,
                thumbnailUrl:
                  contentData.thumbnailUrl ||
                  bundleData.customPreviewThumbnail ||
                  "/placeholder.svg?height=100&width=100",
                fileSize: contentData.fileSize || 25000000,
                duration: contentData.duration || 1200,
                contentType: contentData.contentType || "video",
                mimeType: contentData.mimeType,
                filename: contentData.filename || contentData.title || "content",
              }
            }
            return null
          } catch (error) {
            console.warn(`⚠️ [Verify & Grant] Error fetching content item ${itemId}:`, error)
            return null
          }
        })

        const resolvedContents = await Promise.all(contentPromises)
        bundleContents = resolvedContents.filter((item) => item !== null)
        contentCount = bundleContents.length
        totalSize = bundleContents.reduce((sum, item) => sum + (item.fileSize || 0), 0)
        console.log(`✅ [Verify & Grant] Found ${contentCount} content items with proper titles from productBoxContent`)
      } else {
        console.log(`⚠️ [Verify & Grant] No bundle contents found, bundle may be empty`)
        bundleContents = []
        contentCount = 0
        totalSize = 0
      }
    } catch (error) {
      console.warn(`⚠️ [Verify & Grant] Error processing bundle contents:`, error)
      bundleContents = []
      contentCount = 0
      totalSize = 0
    }

    // Generate access token and purchase ID
    const accessToken = `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const purchaseId = `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create bundlePurchases record with ACTUAL USER UID
    const bundlePurchaseData = {
      id: purchaseId,
      bundleId: productBoxId,
      productBoxId: productBoxId,
      bundleTitle: bundleData.title || "Untitled Bundle",
      productBoxTitle: bundleData.title || "Untitled Bundle",
      description: bundleData.description || "Premium content bundle",
      productBoxDescription: bundleData.description || "Premium content bundle",
      thumbnailUrl:
        bundleData.customPreviewThumbnail || bundleData.thumbnailUrl || "/placeholder.svg?height=200&width=200",
      productBoxThumbnail:
        bundleData.customPreviewThumbnail || bundleData.thumbnailUrl || "/placeholder.svg?height=200&width=200",

      // Creator information
      creatorId: creatorIdToUse || "unknown",
      creatorName: creatorData.name,
      creatorUsername: creatorData.username,

      // Purchase details
      amount: bundleData.price || 0,
      currency: "usd",
      status: "completed",

      // Content information with proper titles
      contents: bundleContents,
      items: bundleContents,
      contentCount: contentCount,
      totalItems: contentCount,
      totalSize: totalSize,

      // Timestamps
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      purchasedAt: new Date().toISOString(),
      purchaseDate: new Date().toISOString(),

      // Access control
      accessToken: accessToken,
      source: "direct_access",

      // CRITICAL FIX: Use actual authenticated user UID (not "anonymous")
      buyerUid: userId, // This is the real Firebase UID
      userId: userId, // This is the real Firebase UID
      userEmail: userEmail,
      isAuthenticated: true,
    }

    console.log(`📝 [Verify & Grant] Creating purchase record with buyerUid: ${userId}`)

    // Store in bundlePurchases collection with the actual user UID
    try {
      await db.collection("bundlePurchases").doc(purchaseId).set(bundlePurchaseData)
      console.log(`✅ [Verify & Grant] Bundle purchase record created with actual user UID: ${userId}`)
    } catch (error) {
      console.error(`❌ [Verify & Grant] Error creating bundle purchase record:`, error)
      throw error
    }

    // Set access token cookie
    const response = NextResponse.json({
      success: true,
      purchase: bundlePurchaseData,
      message: "Access granted successfully",
      bundleId: productBoxId,
      bundleTitle: bundleData.title,
      isAuthenticated: true,
      userId: userId,
    })

    response.cookies.set(`purchase_access_${productBoxId}`, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    })

    console.log(
      `🎉 [Verify & Grant] Purchase access granted successfully for bundle: ${bundleData.title} (User UID: ${userId})`,
    )

    return response
  } catch (error: any) {
    console.error(`❌ [Verify & Grant] Unexpected error:`, error)
    return NextResponse.json(
      {
        error: "Failed to grant access",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
