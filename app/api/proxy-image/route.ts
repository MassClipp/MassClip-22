import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get("url")

    if (!imageUrl) {
      return new NextResponse("Missing image URL", { status: 400 })
    }

    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(imageUrl)

    console.log("[v0] Image proxy request for:", decodedUrl)

    // Fetch the image from R2 storage
    const response = await fetch(decodedUrl)

    if (!response.ok) {
      console.log("[v0] Failed to fetch image:", response.status, response.statusText)
      return new NextResponse("Failed to fetch image", { status: response.status })
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer()

    // Determine content type from URL extension
    const getContentType = (url: string): string => {
      const extension = url.split(".").pop()?.toLowerCase()
      switch (extension) {
        case "jpg":
        case "jpeg":
          return "image/jpeg"
        case "png":
          return "image/png"
        case "gif":
          return "image/gif"
        case "webp":
          return "image/webp"
        case "svg":
          return "image/svg+xml"
        default:
          return "image/jpeg" // Default fallback
      }
    }

    const contentType = getContentType(decodedUrl)
    console.log("[v0] Serving image with content-type:", contentType)

    // Return the image with proper headers for Safari compatibility
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("[v0] Image proxy error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
