import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("🧪 [Simple Verification] Starting simple test...")

    // Mock successful verification without database calls
    const mockPurchase = {
      productBoxId: "test-product-box-123",
      productTitle: "Test Product Box",
      amount: 29.99,
      currency: "usd",
      sessionId: "cs_test_simple_123",
      creatorUsername: "testcreator",
      status: "completed",
      purchasedAt: new Date().toISOString(),
    }

    console.log("✅ [Simple Verification] Mock verification successful")

    return NextResponse.json({
      success: true,
      purchase: mockPurchase,
      message: "This is a mock verification without database calls",
    })
  } catch (error) {
    console.error("❌ [Simple Verification] Error:", error)
    return NextResponse.json(
      {
        error: "Simple verification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
