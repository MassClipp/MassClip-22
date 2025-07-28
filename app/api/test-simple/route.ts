import { NextResponse } from "next/server"

export async function GET() {
  console.log("🔍 [Test Simple] Simple API test endpoint hit")
  return NextResponse.json({
    success: true,
    message: "API is working",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
}

export async function POST(request: Request) {
  try {
    console.log("🔍 [Test Simple] POST request received")
    const body = await request.json()
    console.log("🔍 [Test Simple] Body:", body)

    return NextResponse.json({
      success: true,
      message: "POST request successful",
      receivedData: body,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ [Test Simple] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process request",
      },
      { status: 500 },
    )
  }
}
