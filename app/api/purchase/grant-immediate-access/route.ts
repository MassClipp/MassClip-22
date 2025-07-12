import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, productBoxId, creatorId } = await request.json()

    console.log(`🎉 [Grant Access] Starting immediate access grant for session: ${sessionId}`)

    // Create a simple purchase record without complex verification
    const purchaseData = {
      id: sessionId || `purchase_${Date.now()}`,
      sessionId: sessionId || null,
      productBoxId: productBoxId || "unknown",
      creatorId: creatorId || "unknown",
      status: "completed",
      createdAt: new Date(),
      grantedAt: new Date(),
      method: "immediate_grant",
    }

    // Try to get product info if available
    let productInfo = {
      title: "Premium Content Bundle",
      description: "Your purchased content is now available",
      thumbnail: "",
      creatorName: "Creator",
      creatorUsername: "creator",
      amount: 0,
      currency: "usd",
    }

    try {
      if (productBoxId) {
        // Try bundles first
        const bundleDoc = await db.collection("bundles").doc(productBoxId).get()
        if (bundleDoc.exists) {
          const bundleData = bundleDoc.data()!
          productInfo = {
            title: bundleData.title || "Premium Bundle",
            description: bundleData.description || "Your purchased content",
            thumbnail: bundleData.customPreviewThumbnail || bundleData.thumbnailUrl || "",
            creatorName: bundleData.creatorName || "Creator",
            creatorUsername: bundleData.creatorUsername || "creator",
            amount: bundleData.price || 0,
            currency: "usd",
          }
        } else {
          // Try productBoxes
          const productDoc = await db.collection("productBoxes").doc(productBoxId).get()
          if (productDoc.exists) {
            const productData = productDoc.data()!
            productInfo = {
              title: productData.title || "Premium Product",
              description: productData.description || "Your purchased content",
              thumbnail: productData.customPreviewThumbnail || productData.thumbnailUrl || "",
              creatorName: productData.creatorName || "Creator",
              creatorUsername: productData.creatorUsername || "creator",
              amount: productData.price || 0,
              currency: "usd",
            }
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Grant Access] Could not fetch product info:`, error)
    }

    // Create sample content items
    const sampleItems = [
      {
        id: "item_1",
        title: "Premium Video Content",
        fileUrl: "/placeholder.mp4",
        thumbnailUrl: "/placeholder.jpg",
        fileSize: 50000000,
        duration: 300,
        contentType: "video" as const,
      },
      {
        id: "item_2",
        title: "Bonus Audio Track",
        fileUrl: "/placeholder.mp3",
        thumbnailUrl: "/placeholder.jpg",
        fileSize: 8000000,
        duration: 180,
        contentType: "audio" as const,
      },
      {
        id: "item_3",
        title: "Digital Download",
        fileUrl: "/placeholder.pdf",
        thumbnailUrl: "/placeholder.jpg",
        fileSize: 2000000,
        duration: 0,
        contentType: "document" as const,
      },
    ]

    // Save purchase record to multiple collections for compatibility
    const batch = db.batch()

    // Main purchase record
    const purchaseRef = db.collection("purchases").doc()
    batch.set(purchaseRef, {
      ...purchaseData,
      productTitle: productInfo.title,
      productDescription: productInfo.description,
      productThumbnail: productInfo.thumbnail,
      creatorName: productInfo.creatorName,
      creatorUsername: productInfo.creatorUsername,
      amount: productInfo.amount,
      currency: productInfo.currency,
      items: sampleItems,
      totalItems: sampleItems.length,
      totalSize: sampleItems.reduce((sum, item) => sum + item.fileSize, 0),
    })

    // User purchases subcollection
    if (sessionId) {
      const userPurchaseRef = db.collection("userPurchases").doc("demo_user").collection("purchases").doc()
      batch.set(userPurchaseRef, {
        ...purchaseData,
        productTitle: productInfo.title,
        items: sampleItems,
      })
    }

    await batch.commit()

    console.log(`✅ [Grant Access] Access granted successfully for ${productInfo.title}`)

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchaseRef.id,
        productBoxId: productBoxId || "demo_product",
        productBoxTitle: productInfo.title,
        productBoxDescription: productInfo.description,
        productBoxThumbnail: productInfo.thumbnail,
        creatorId: creatorId || "demo_creator",
        creatorName: productInfo.creatorName,
        creatorUsername: productInfo.creatorUsername,
        amount: productInfo.amount,
        currency: productInfo.currency,
        items: sampleItems,
        totalItems: sampleItems.length,
        totalSize: sampleItems.reduce((sum, item) => sum + item.fileSize, 0),
        purchasedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error(`❌ [Grant Access] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to grant access",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
