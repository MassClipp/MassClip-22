import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get("url")

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    console.log("🖼️ Proxying image request for:", imageUrl)

    // Fetch the image from the original URL
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MassClip/1.0)",
      },
    })

    if (!response.ok) {
      console.error("❌ Failed to fetch image:", response.status, response.statusText)
      return NextResponse.json({ error: "Failed to fetch image" }, { status: response.status })
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer()

    let contentType = response.headers.get("content-type") || "image/jpeg"

    // Override content type based on file extension if needed
    const url = new URL(imageUrl)
    const pathname = url.pathname.toLowerCase()
    if (pathname.endsWith(".png")) {
      contentType = "image/png"
    } else if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
      contentType = "image/jpeg"
    } else if (pathname.endsWith(".webp")) {
      contentType = "image/webp"
    } else if (pathname.endsWith(".gif")) {
      contentType = "image/gif"
    }

    const contentLength = response.headers.get("content-length")

    console.log("✅ Image fetched successfully:", {
      contentType,
      contentLength,
      size: imageBuffer.byteLength,
    })

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": contentLength || imageBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Range",
      },
    })
  } catch (error) {
    console.error("❌ Image proxy error:", error)
    return NextResponse.json(
      {
        error: "Failed to proxy image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function HEAD(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get("url")

    if (!imageUrl) {
      return new NextResponse(null, { status: 400 })
    }

    // HEAD request for image metadata
    const response = await fetch(imageUrl, { method: "HEAD" })

    if (!response.ok) {
      return new NextResponse(null, { status: response.status })
    }

    let contentType = response.headers.get("content-type") || "image/jpeg"

    // Override content type based on file extension
    const url = new URL(imageUrl)
    const pathname = url.pathname.toLowerCase()
    if (pathname.endsWith(".png")) {
      contentType = "image/png"
    } else if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
      contentType = "image/jpeg"
    } else if (pathname.endsWith(".webp")) {
      contentType = "image/webp"
    } else if (pathname.endsWith(".gif")) {
      contentType = "image/gif"
    }

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
      },
    })
  } catch (error) {
    console.error("❌ Image HEAD proxy error:", error)
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
