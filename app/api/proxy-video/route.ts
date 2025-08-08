import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoUrl = searchParams.get("url")

    if (!videoUrl) {
      return NextResponse.json({ error: "Video URL is required" }, { status: 400 })
    }

    console.log("🎥 Proxying video request for:", videoUrl)

    // Fetch the video from the original URL
    const response = await fetch(videoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MassClip/1.0)",
      },
    })

    if (!response.ok) {
      console.error("❌ Failed to fetch video:", response.status, response.statusText)
      return NextResponse.json({ error: "Failed to fetch video" }, { status: response.status })
    }

    // Get the video data
    const videoBuffer = await response.arrayBuffer()
    const contentType = response.headers.get("content-type") || "video/mp4"
    const contentLength = response.headers.get("content-length")

    console.log("✅ Video fetched successfully:", {
      contentType,
      contentLength,
      size: videoBuffer.byteLength,
    })

    // Return the video with proper headers
    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": contentLength || videoBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Range",
        "Accept-Ranges": "bytes",
      },
    })
  } catch (error) {
    console.error("❌ Video proxy error:", error)
    return NextResponse.json(
      {
        error: "Failed to proxy video",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function HEAD(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoUrl = searchParams.get("url")

    if (!videoUrl) {
      return new NextResponse(null, { status: 400 })
    }

    // HEAD request for video metadata
    const response = await fetch(videoUrl, { method: "HEAD" })

    if (!response.ok) {
      return new NextResponse(null, { status: response.status })
    }

    const contentType = response.headers.get("content-type") || "video/mp4"
    const contentLength = response.headers.get("content-length")

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": contentLength || "0",
        "Cache-Control": "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Range",
        "Accept-Ranges": "bytes",
      },
    })
  } catch (error) {
    console.error("❌ Video HEAD proxy error:", error)
    return new NextResponse(null, { status: 500 })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Range",
    },
  })
}
