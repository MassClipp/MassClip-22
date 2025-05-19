import { type NextRequest, NextResponse } from "next/server"
import { testVideoUrl } from "@/lib/video-utils"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ success: false, message: "No URL provided" }, { status: 400 })
    }

    const result = await testVideoUrl(url)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error testing video URL:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Server error: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
