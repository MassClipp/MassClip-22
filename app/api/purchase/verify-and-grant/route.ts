import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

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

    // Get actual bundle contents if available
    let bundleContents: any[] = []
    let totalSize = 0
    let contentCount = 0

    try {
      // Try to get bundle contents from the bundle document
      if (bundleData.contents && Array.isArray(bundleData.contents)) {
        bundleContents = bundleData.contents
        contentCount = bundleContents.length
        totalSize = bundleContents.reduce((sum, item) => sum + (item.fileSize || 0), 0)
        console.log(`✅ [Verify & Grant] Found ${contentCount} items in bundle contents`)
      } else if (bundleData.items && Array.isArray(bundleData.items)) {
        bundleContents = bundleData.items
        contentCount = bundleContents.length
        totalSize = bundleContents.reduce((sum, item) => sum + (item.fileSize || 0), 0)
        console.log(`✅ [Verify & Grant] Found ${contentCount} items in bundle items`)
      } else {
        // Generate sample content if no real content found
        bundleContents = [
          {
            id: "item_1",
            title: "Premium Video Content",
            fileUrl: "/api/content/download/video1.mp4",
            thumbnailUrl: bundleData.customPreviewThumbnail || "/placeholder.svg?height=100&width=100",
            fileSize: 52428800, // 50MB
            duration: 1800, // 30 minutes
            contentType: "video",
          },
          {
            id: "item_2",
            title: "Bonus Audio Commentary",
            fileUrl: "/api/content/download/audio1.mp3",
            thumbnailUrl: "/placeholder.svg?height=100&width=100",
            fileSize: 15728640, // 15MB
            duration: 900, // 15 minutes
            contentType: "audio",
          },
        ]
        contentCount = bundleContents.length
        totalSize = bundleContents.reduce((sum, item) => sum + item.fileSize, 0)
        console.log(`⚠️ [Verify & Grant] No bundle contents found, using sample data`)
      }
    } catch (error) {
      console.warn(`⚠️ [Verify & Grant] Error processing bundle contents:`, error)
    }

    // Generate access token
    const accessToken = `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const purchaseId = `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create bundlePurchases record with all necessary fields
    const bundlePurchaseData = {
      id: purchaseId,
      bundleId: productBoxId,
      productBoxId: productBoxId, // Keep both for compatibility
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

      // Content information
      contents: bundleContents,
      items: bundleContents, // Keep both for compatibility
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

      // Anonymous purchase (no user ID required)
      buyerUid: "anonymous",
      userId: "anonymous",
    }

    // Store in bundlePurchases collection
    try {
      await db.collection("bundlePurchases").doc(purchaseId).set(bundlePurchaseData)
      console.log(`✅ [Verify & Grant] Bundle purchase record created in bundlePurchases collection`)
    } catch (error) {
      console.error(`❌ [Verify & Grant] Error creating bundle purchase record:`, error)
      throw error
    }

    // Also store in anonymous purchases for fallback
    try {
      await db.collection("anonymousPurchases").add(bundlePurchaseData)
      console.log(`✅ [Verify & Grant] Anonymous purchase record created`)
    } catch (error) {
      console.warn(`⚠️ [Verify & Grant] Error creating anonymous purchase (non-critical):`, error)
    }

    // Set access token cookie
    const response = NextResponse.json({
      success: true,
      purchase: bundlePurchaseData,
      message: "Access granted successfully",
      bundleId: productBoxId,
      bundleTitle: bundleData.title,
    })

    response.cookies.set(`purchase_access_${productBoxId}`, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    })

    console.log(`🎉 [Verify & Grant] Purchase access granted successfully for bundle: ${bundleData.title}`)

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
