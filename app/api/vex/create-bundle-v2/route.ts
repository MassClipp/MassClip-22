import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("🚀 [V2] Fresh route called successfully!")

  try {
    const body = await request.json()
    console.log("🚀 [V2] Request body:", body)

    return NextResponse.json({
      success: true,
      message: "Fresh v2 route working",
      receivedData: body,
    })
  } catch (error) {
    console.error("❌ [V2] Error in fresh route:", error)
    return NextResponse.json(
      {
        error: "Fresh route error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
