import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("🚀 [TEST] Minimal POST route called successfully!")

  try {
    const body = await request.json()
    console.log("🚀 [TEST] Request body:", body)

    return NextResponse.json({
      success: true,
      message: "Minimal test route working",
      receivedData: body,
    })
  } catch (error) {
    console.error("❌ [TEST] Error in minimal route:", error)
    return NextResponse.json(
      {
        error: "Test route error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
