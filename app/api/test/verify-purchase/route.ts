import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, productBoxId } = body

    console.log("🧪 [Test Verify] Testing purchase verification with:", { sessionId, productBoxId })

    // Mock successful verification without any external calls
    const mockVerification = {
      success: true,
      purchase: {
        id: `purchase_${Date.now()}`,
        sessionId: sessionId || "cs_test_mock_session",
        productBoxId: productBoxId || "test-product-box-123",
        productTitle: "Mock Test Product Box",
        amount: 29.99,
        currency: "usd",
        status: "completed",
        buyerUid: "test-user-123",
        creatorId: "test-creator-123",
        creatorUsername: "testcreator",
        purchasedAt: new Date().toISOString(),
        type: "product_box",
      },
      message: "Mock verification successful - no external dependencies",
    }

    console.log("✅ [Test Verify] Mock verification completed successfully")

    return NextResponse.json(mockVerification)
  } catch (error) {
    console.error("❌ [Test Verify] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Test verification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Test verification endpoint",
    usage: "POST with sessionId and productBoxId",
    example: {
      sessionId: "cs_test_123",
      productBoxId: "test-product-box-123",
    },
  })
}
