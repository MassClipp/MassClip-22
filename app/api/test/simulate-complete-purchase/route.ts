import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    const testUserId = userId || "test-user-123"

    console.log("🔍 [Simulate Purchase] Creating test purchase for:", testUserId)

    // Create a test product box first
    const testProductBox = {
      title: "Premium Video Bundle",
      description: "High-quality video content bundle",
      price: 29.99,
      contentItems: [
        {
          id: "video1",
          title: "Video 1 - Introduction",
          type: "video",
          url: "https://example.com/video1.mp4",
          thumbnailUrl: "https://example.com/thumb1.jpg",
        },
        {
          id: "video2",
          title: "Video 2 - Advanced Techniques",
          type: "video",
          url: "https://example.com/video2.mp4",
          thumbnailUrl: "https://example.com/thumb2.jpg",
        },
      ],
      coverImage: "https://example.com/cover.jpg",
      creatorId: "test-creator-123",
      type: "product_box",
    }

    const productBoxRef = await db.collection("productBoxes").add(testProductBox)
    const productBoxId = productBoxRef.id

    // Now create the purchase
    const purchaseData = {
      productBoxId,
      productTitle: testProductBox.title,
      productDescription: testProductBox.description,
      contentItems: testProductBox.contentItems,
      coverImage: testProductBox.coverImage,
      accessUrl: `/product-box/${productBoxId}/content`,

      buyerUid: testUserId,
      amount: testProductBox.price,
      currency: "usd",
      sessionId: `cs_test_${Date.now()}`,
      status: "completed",
      type: "product_box",

      purchasedAt: new Date(),
      createdAt: new Date(),
    }

    // Save to both collections
    await db.collection("purchases").add(purchaseData)
    await db.collection("users").doc(testUserId).collection("purchases").add(purchaseData)

    console.log("✅ [Simulate Purchase] Test purchase created successfully")

    return NextResponse.json({
      success: true,
      purchase: purchaseData,
      message: "Test purchase created successfully",
    })
  } catch (error) {
    console.error("❌ [Simulate Purchase] Error:", error)
    return NextResponse.json({ error: "Failed to create test purchase" }, { status: 500 })
  }
}
