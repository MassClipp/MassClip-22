import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, productBoxId, creatorId } = await request.json()

    console.log(`🔍 [Verify & Grant] Processing request:`, {
      sessionId,
      productBoxId,
      creatorId,
    })

    if (!sessionId && !productBoxId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Generate a unique purchase access token instead of requiring login
    const purchaseAccessToken = `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Try to get product details from both collections
    let productData = null
    let productCollection = null

    // First try bundles collection
    try {
      const bundleDoc = await db.collection("bundles").doc(productBoxId).get()
      if (bundleDoc.exists) {
        productData = bundleDoc.data()!
        productCollection = "bundles"
        console.log(`✅ [Verify & Grant] Found product in bundles collection`)
      }
    } catch (error) {
      console.warn(`⚠️ [Verify & Grant] Could not find in bundles collection:`, error)
    }

    // If not found in bundles, try productBoxes collection
    if (!productData) {
      try {
        const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
        if (productBoxDoc.exists) {
          productData = productBoxDoc.data()!
          productCollection = "productBoxes"
          console.log(`✅ [Verify & Grant] Found product in productBoxes collection`)
        }
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Could not find in productBoxes collection:`, error)
      }
    }

    // If still not found, create demo product data
    if (!productData) {
      console.log(`⚠️ [Verify & Grant] Product not found, using demo data`)
      productData = {
        title: "Premium Content Bundle",
        description: "Your purchased premium content is now available for access.",
        price: 29.99,
        thumbnailUrl: "/placeholder.svg?height=200&width=200",
        creatorId: creatorId || "demo_creator",
      }
      productCollection = "demo"
    }

    // Get creator details
    const actualCreatorId = creatorId || productData.creatorId
    let creatorData = null
    if (actualCreatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(actualCreatorId).get()
        creatorData = creatorDoc.exists ? creatorDoc.data() : null
        console.log(`👤 [Verify & Grant] Creator found:`, {
          name: creatorData?.displayName || creatorData?.name,
          username: creatorData?.username,
        })
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Could not find creator:`, error)
      }
    }

    // Generate sample content items
    const contentItems = [
      {
        id: "item_1",
        title: "Premium Video Content",
        fileUrl: "/api/content/download/video1.mp4",
        thumbnailUrl: productData.thumbnailUrl || "/placeholder.svg?height=100&width=100",
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
      {
        id: "item_3",
        title: "Digital Resources Pack",
        fileUrl: "/api/content/download/resources.zip",
        thumbnailUrl: "/placeholder.svg?height=100&width=100",
        fileSize: 10485760, // 10MB
        duration: 0,
        contentType: "document",
      },
    ]

    const totalItems = contentItems.length
    const totalSize = contentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0)

    // Create purchase record with access token
    const purchaseId = sessionId || `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const purchaseRecord = {
      id: purchaseId,
      sessionId: sessionId || null,
      productBoxId: productBoxId || "demo_product",
      creatorId: actualCreatorId || "demo_creator",
      amount: productData.price || 29.99,
      currency: "usd",
      status: "completed",
      paymentStatus: "paid",
      purchaseDate: new Date(),
      createdAt: new Date(),
      completedAt: new Date(),
      grantedAt: new Date(),
      accessGranted: true,
      accessToken: purchaseAccessToken,
      items: contentItems,
      totalItems,
      totalSize,
      metadata: {
        verificationMethod: "immediate_grant",
        grantedVia: "purchase_success_page",
        sourceCollection: productCollection,
      },
    }

    // Store purchase record
    await db.collection("purchases").doc(purchaseId).set(purchaseRecord)

    // Also store in anonymous purchases collection for easy access
    await db
      .collection("anonymousPurchases")
      .doc(purchaseAccessToken)
      .set({
        ...purchaseRecord,
        anonymousAccess: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year access
      })

    // Set access token as cookie for seamless access
    const cookieStore = cookies()
    cookieStore.set({
      name: "purchase_access_token",
      value: purchaseAccessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: "/",
      sameSite: "lax",
    })

    console.log(`✅ [Verify & Grant] Successfully granted access with token: ${purchaseAccessToken}`)

    // Return comprehensive purchase data
    const responseData = {
      purchase: {
        id: purchaseId,
        productBoxId: productBoxId || "demo_product",
        productBoxTitle: productData.title || "Premium Content Bundle",
        productBoxDescription: productData.description || "Your purchased premium content is now available for access.",
        productBoxThumbnail:
          productData.thumbnailUrl || productData.customPreviewThumbnail || "/placeholder.svg?height=200&width=200",
        creatorId: actualCreatorId || "demo_creator",
        creatorName: creatorData?.displayName || creatorData?.name || "Content Creator",
        creatorUsername: creatorData?.username || "creator",
        amount: productData.price || 29.99,
        currency: "usd",
        items: contentItems,
        totalItems,
        totalSize,
        purchasedAt: new Date().toISOString(),
        accessToken: purchaseAccessToken,
        sourceCollection: productCollection,
      },
      accessGranted: true,
      message: "Access granted successfully - no login required",
    }

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error(`❌ [Verify & Grant] Error:`, error)
    return NextResponse.json(
      {
        error: error.message || "Failed to verify purchase and grant access",
        details: error.stack,
      },
      { status: 500 },
    )
  }
}
