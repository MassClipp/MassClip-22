import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // This endpoint simply accepts a file upload and returns success
    // It's used to test upload speeds from the client

    const formData = await request.formData()
    const testFile = formData.get("testFile")

    if (!testFile) {
      return NextResponse.json({ error: "No test file provided" }, { status: 400 })
    }

    // Return success response
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in upload speed test:", error)
    return NextResponse.json(
      {
        error: "Failed to process upload test",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
