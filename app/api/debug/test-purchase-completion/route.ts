import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, buyerUid, userEmail } = await request.json()

    console.log("🧪 [Debug Purchase] Testing purchase completion with:", {
      productBoxId,
      buyerUid,
      userEmail,
    })

    // Call the purchase completion endpoint
    const completionResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/purchase/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        buyerUid: buyerUid || "test-user-123",
        productBoxId: productBoxId || "test-product-box",
        sessionId: `test-session-${Date.now()}`,
        amount: 2999, // $29.99
        currency: "usd",
        userEmail: userEmail || "test@example.com",
        userName: "Test User",
      }),
    })

    const completionResult = await completionResponse.json()

    console.log("🧪 [Debug Purchase] Completion response:", completionResult)

    return NextResponse.json({
      success: true,
      completionResponse: completionResult,
      status: completionResponse.status,
    })
  } catch (error) {
    console.error("❌ [Debug Purchase] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
