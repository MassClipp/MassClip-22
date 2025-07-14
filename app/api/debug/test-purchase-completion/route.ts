import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, buyerUid, sessionId } = await request.json()

    console.log("🧪 [Test Purchase] Testing purchase completion:", {
      productBoxId,
      buyerUid,
      sessionId,
    })

    // Call the actual purchase completion endpoint
    const completionResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/purchase/verify-and-complete-bundle`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          productBoxId,
          forceComplete: true,
        }),
      },
    )

    const completionResult = await completionResponse.json()

    console.log("🧪 [Test Purchase] Completion result:", completionResult)

    return NextResponse.json({
      success: true,
      testResult: completionResult,
      apiStatus: completionResponse.status,
    })
  } catch (error) {
    console.error("❌ [Test Purchase] Error:", error)
    return NextResponse.json({ error: "Test failed", details: error.message }, { status: 500 })
  }
}
