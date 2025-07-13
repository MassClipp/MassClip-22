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

    // Generate sample content items (since we don't have real content structure)
    const sampleItems = [
      {
        id: "item_1",
        title: "Premium Video Content",
        fileUrl: "/api/content/download/video1.mp4",
        thumbnailUrl: bundleData.customPreviewThumbnail || "/placeholder.svg?height=100&width=100",
        fileSize: 52428800, // 50MB
        duration: 1800, // 30 minutes
        contentType: "video" as const,
      },
      {
        id: "item_2",
        title: "Bonus Audio Commentary",
        fileUrl: "/api/content/download/audio1.mp3",
        thumbnailUrl: "/placeholder.svg?height=100&width=100",
        fileSize: 15728640, // 15MB
        duration: 900, // 15 minutes
        contentType: "audio" as const,
      },
      {
        id: "item_3",
        title: "Digital Resources Pack",
        fileUrl: "/api/content/download/resources.zip",
        thumbnailUrl: "/placeholder.svg?height=100&width=100",
        fileSize: 10485760, // 10MB
        duration: 0,
        contentType: "document" as const,
      },
    ]

    const totalSize = sampleItems.reduce((sum, item) => sum + item.fileSize, 0)

    // Generate access token
    const accessToken = `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Prepare purchase data
    const purchaseData = {
      id: `purchase_${Date.now()}`,
      productBoxId: productBoxId,
      productBoxTitle: bundleData.title || "Untitled Bundle",
      productBoxDescription: bundleData.description || "Premium content bundle",
      productBoxThumbnail:
        bundleData.customPreviewThumbnail || bundleData.thumbnailUrl || "/placeholder.svg?height=200&width=200",
      creatorId: creatorIdToUse || "unknown",
      creatorName: creatorData.name,
      creatorUsername: creatorData.username,
      amount: bundleData.price || 0,
      currency: "usd",
      items: sampleItems,
      totalItems: sampleItems.length,
      totalSize: totalSize,
      purchasedAt: new Date().toISOString(),
      status: "completed",
      accessToken: accessToken,
      source: "direct_access",
    }

    // Store in anonymous purchases collection
    try {
      await db.collection("anonymousPurchases").add(purchaseData)
      console.log(`✅ [Verify & Grant] Anonymous purchase record created`)
    } catch (error) {
      console.error(`❌ [Verify & Grant] Error creating anonymous purchase:`, error)
    }

    // Set access token cookie
    const response = NextResponse.json({
      success: true,
      purchase: purchaseData,
      message: "Access granted successfully",
    })

    response.cookies.set(`purchase_access_${productBoxId}`, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    })

    console.log(`🎉 [Verify & Grant] Purchase access granted successfully!`)

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
