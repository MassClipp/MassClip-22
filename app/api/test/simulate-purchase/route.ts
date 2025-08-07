import { NextResponse } from "next/server"

const mockPurchase = {
  productBoxId: "test-product-box-123",
  productTitle: "Test Product Box",
  amount: 29.99,
  currency: "usd",
  sessionId: "cs_test_" + Math.random().toString(36).substring(7),
  creatorUsername: "testcreator",
}

export async function POST() {
  try {
    console.log("✅ [Test Purchase] Simulated purchase (POST):", mockPurchase)

    return NextResponse.json({
      success: true,
      purchase: mockPurchase,
    })
  } catch (error) {
    console.error("❌ [Test Purchase] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to simulate purchase",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    console.log("✅ [Test Purchase] Simulated purchase (GET):", mockPurchase)

    return NextResponse.json({
      success: true,
      purchase: mockPurchase,
      message: "This is a test simulation. Use POST for actual testing.",
    })
  } catch (error) {
    console.error("❌ [Test Purchase] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to simulate purchase",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
