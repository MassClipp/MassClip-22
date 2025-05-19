import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("TEST ENDPOINT: Complete upload request received")

    // Get request body
    const { fileId, key } = await request.json()

    // Validate required fields
    if (!fileId || !key) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("Test upload completed successfully for:", { fileId, key })

    return NextResponse.json({
      success: true,
      message: "Test upload completed successfully",
      fileId,
      publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
    })
  } catch (error) {
    console.error("Error completing test upload:", error)
    return NextResponse.json(
      { error: "Failed to complete test upload", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
