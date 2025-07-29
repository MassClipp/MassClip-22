import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId, productBoxId, scenario = "success" } = await request.json()

    const testSessionId = sessionId || `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const testUserId = userId || `test_user_${Date.now()}`
    const testProductBoxId = productBoxId || `test_bundle_${Date.now()}`

    // Create test purchase record based on scenario
    const purchaseData: any = {
      sessionId: testSessionId,
      userId: testUserId,
      productBoxId: testProductBoxId,
      status: "completed",
      amount: 999,
      currency: "usd",
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        testScenario: scenario,
        createdBy: "debug-tool",
      },
    }

    // Modify data based on scenario
    switch (scenario) {
      case "missing_content":
        purchaseData.items = ["missing_item_1", "missing_item_2", "valid_item_1"]
        break
      case "delivery_fail":
        purchaseData.items = ["broken_url_item_1", "broken_url_item_2"]
        break
      case "large_bundle":
        purchaseData.items = Array.from({ length: 100 }, (_, i) => `large_item_${i + 1}`)
        break
      default:
        purchaseData.items = ["test_item_1", "test_item_2", "test_item_3"]
    }

    // Create purchase record in Firestore
    await db.collection("purchases").doc(testSessionId).set(purchaseData)

    // Create test product box if it doesn't exist
    const productBoxDoc = await db.collection("productBoxes").doc(testProductBoxId).get()
    if (!productBoxDoc.exists) {
      const productBoxData = {
        id: testProductBoxId,
        title: `Test Bundle - ${scenario}`,
        description: `Test bundle created for debugging scenario: ${scenario}`,
        price: 999,
        currency: "usd",
        creatorId: testUserId,
        active: true,
        contentItems: purchaseData.items,
        detailedContentItems: purchaseData.items.map((itemId: string) => ({
          id: itemId,
          title: `Test Item ${itemId}`,
          fileUrl:
            scenario === "delivery_fail"
              ? "https://broken-url.example.com/file.mp4"
              : `https://example.com/${itemId}.mp4`,
          fileSize: Math.floor(Math.random() * 100000000), // Random size up to 100MB
          mimeType: "video/mp4",
          thumbnailUrl: `https://example.com/${itemId}_thumb.jpg`,
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          testScenario: scenario,
          createdBy: "debug-tool",
        },
      }

      await db.collection("productBoxes").doc(testProductBoxId).set(productBoxData)
    }

    // Create test uploads for content items
    for (const itemId of purchaseData.items) {
      const uploadDoc = await db.collection("uploads").doc(itemId).get()
      if (!uploadDoc.exists) {
        const uploadData = {
          id: itemId,
          title: `Test Upload ${itemId}`,
          filename: `${itemId}.mp4`,
          fileUrl:
            scenario === "delivery_fail"
              ? "https://broken-url.example.com/file.mp4"
              : `https://example.com/${itemId}.mp4`,
          fileSize: Math.floor(Math.random() * 100000000),
          mimeType: "video/mp4",
          fileType: "video/mp4",
          thumbnailUrl: `https://example.com/${itemId}_thumb.jpg`,
          uploaderId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            testScenario: scenario,
            createdBy: "debug-tool",
          },
        }

        // For missing content scenario, don't create some uploads
        if (scenario !== "missing_content" || !itemId.includes("missing")) {
          await db.collection("uploads").doc(itemId).set(uploadData)
        }
      }
    }

    // Create user purchase access record
    await db
      .collection("users")
      .doc(testUserId)
      .collection("purchases")
      .doc(testSessionId)
      .set({
        productBoxId: testProductBoxId,
        sessionId: testSessionId,
        status: "completed",
        purchasedAt: new Date(),
        items: purchaseData.items,
        metadata: {
          testScenario: scenario,
          createdBy: "debug-tool",
        },
      })

    return NextResponse.json({
      success: true,
      data: {
        sessionId: testSessionId,
        userId: testUserId,
        productBoxId: testProductBoxId,
        scenario,
        itemsCreated: purchaseData.items.length,
        message: "Test purchase data created successfully",
      },
    })
  } catch (error: any) {
    console.error("Failed to create test purchase:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
