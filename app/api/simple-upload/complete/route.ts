import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("Complete upload endpoint called")

  try {
    // Parse request body
    const body = await request.json()
    const { key, fileName, fileSize, contentType } = body

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 })
    }

    // In a real implementation, you would save this metadata to Firestore
    // For this test, we'll just log it and return success
    console.log("Upload completed for:", {
      key,
      fileName,
      fileSize,
      contentType,
    })

    // Construct the public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`

    return NextResponse.json({
      success: true,
      message: "Upload completed and metadata saved",
      publicUrl,
    })
  } catch (error) {
    console.error("Error completing upload:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to complete upload",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
