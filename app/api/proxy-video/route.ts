import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoUrl = searchParams.get("url")

    if (!videoUrl) {
      console.error("❌ Proxy Video: No URL provided")
      return NextResponse.json({ error: "Video URL is required" }, { status: 400 })
    }

    console.log("🎥 Proxying video request for:", videoUrl)

    // Validate URL format
    try {
      new URL(videoUrl)
    } catch (urlError) {
      console.error("❌ Proxy Video: Invalid URL format:", videoUrl)
      return NextResponse.json({ error: "Invalid video URL format" }, { status: 400 })
    }

    // Fetch the video from the original URL with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const response = await fetch(videoUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MassClip/1.0)",
          "Accept": "video/*,*/*;q=0.9",
          "Accept-Encoding": "identity", // Prevent compression issues
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error("❌ Failed to fetch video:", {
          url: videoUrl,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        })
        return NextResponse.json({ 
          error: "Failed to fetch video", 
          details: `${response.status}: ${response.statusText}` 
        }, { status: response.status })
      }

      // Get the video data
      const videoBuffer = await response.arrayBuffer()
      const contentType = response.headers.get("content-type") || "video/mp4"
      const contentLength = response.headers.get("content-length")

      console.log("✅ Video fetched successfully:", {
        url: videoUrl,
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
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.error("❌ Video fetch timeout:", videoUrl)
        return NextResponse.json({ error: "Video fetch timeout" }, { status: 408 })
      }
      
      console.error("❌ Video fetch error:", {
        url: videoUrl,
        error: fetchError.message,
        name: fetchError.name
      })
      throw fetchError
    }
  } catch (error) {
    console.error("❌ Video proxy error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    })
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

    // Validate URL format
    try {
      new URL(videoUrl)
    } catch (urlError) {
      console.error("❌ Proxy Video HEAD: Invalid URL format:", videoUrl)
      return new NextResponse(null, { status: 400 })
    }

    // HEAD request for video metadata with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout for HEAD

    try {
      const response = await fetch(videoUrl, { 
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MassClip/1.0)",
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error("❌ HEAD request failed:", videoUrl, response.status)
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
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error("❌ Video HEAD proxy error:", videoUrl, fetchError.message)
      return new NextResponse(null, { status: 500 })
    }
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
