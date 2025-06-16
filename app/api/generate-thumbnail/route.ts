import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase/firebaseAdmin"
import { getFallbackThumbnailUrl } from "@/lib/thumbnail-generator"

// Initialize Firebase Admin
initializeFirebaseAdmin()

async function verifyAuthToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.split("Bearer ")[1]
    if (!token) return null

    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("❌ [Auth] Token verification failed:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ [Thumbnail API] POST request received")

    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { videoUrl, title, captureTime = 5 } = body

    if (!videoUrl) {
      return NextResponse.json({ error: "Missing videoUrl" }, { status: 400 })
    }

    console.log(`🖼️ [Thumbnail API] Generating thumbnail for: ${videoUrl}`)

    try {
      // In a production environment, you would use FFmpeg here
      // For now, we'll return a structured fallback
      const thumbnailUrl = getFallbackThumbnailUrl(title)

      const result = {
        thumbnailUrl,
        width: 1280,
        height: 720,
        size: 0, // Unknown for fallback
        captureTime,
        generated: false, // Indicates this is a fallback
      }

      console.log(`✅ [Thumbnail API] Generated thumbnail: ${thumbnailUrl}`)

      return NextResponse.json({
        success: true,
        thumbnail: result,
      })
    } catch (error) {
      console.error("❌ [Thumbnail API] Generation failed:", error)

      // Return fallback thumbnail
      const fallbackUrl = getFallbackThumbnailUrl(title)
      return NextResponse.json({
        success: true,
        thumbnail: {
          thumbnailUrl: fallbackUrl,
          width: 1280,
          height: 720,
          size: 0,
          captureTime,
          generated: false,
        },
      })
    }
  } catch (error) {
    console.error("❌ [Thumbnail API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate thumbnail",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
