import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return new NextResponse("Missing URL parameter", { status: 400 })
  }

  try {
    const response = await fetch(url)

    if (!response.ok) {
      return new NextResponse("Failed to fetch video", { status: response.status })
    }

    // Get the file name from the URL or Content-Disposition header
    const contentDisposition = response.headers.get("content-disposition")
    let fileName = "video.mp4"

    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="(.+)"/)
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = fileNameMatch[1]
      }
    } else {
      // Try to extract filename from URL
      const urlParts = new URL(url).pathname.split("/")
      const lastPart = urlParts[urlParts.length - 1]
      if (lastPart && lastPart.includes(".")) {
        fileName = lastPart
      }
    }

    // Stream the response with proper headers
    const headers = new Headers()
    headers.set("Content-Type", "video/mp4")
    headers.set("Content-Disposition", `attachment; filename="${fileName}"`)

    return new NextResponse(response.body, {
      headers,
      status: 200,
    })
  } catch (error) {
    console.error("Download proxy error:", error)
    return new NextResponse("Failed to proxy download", { status: 500 })
  }
}
