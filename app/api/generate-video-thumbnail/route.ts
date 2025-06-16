import { type NextRequest, NextResponse } from "next/server"
import { ThumbnailService } from "@/lib/thumbnail-service"
import { initializeFirebaseAdmin } from "@/lib/firebase/firebaseAdmin"

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
    console.log("🔍 [Thumbnail API] POST request received")

    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoUrl, filename, width, height, timeInSeconds } = await request.json()

    if (!videoUrl || !filename) {
      return NextResponse.json({ error: "videoUrl and filename are required" }, { status: 400 })
    }

    console.log(`🖼️ [Thumbnail API] Generating thumbnail for: ${filename}`)

    const result = await ThumbnailService.generateThumbnail(videoUrl, filename, {
      width: width || 480,
      height: height || 270,
      timeInSeconds: timeInSeconds || 1,
    })

    if (result.success) {
      console.log(`✅ [Thumbnail API] Thumbnail generated successfully: ${result.thumbnailUrl}`)
      return NextResponse.json({
        success: true,
        thumbnailUrl: result.thumbnailUrl,
        source: result.source,
      })
    } else {
      console.error(`❌ [Thumbnail API] Thumbnail generation failed: ${result.error}`)
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          fallbackUrl: ThumbnailService.getFallbackThumbnail(),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Thumbnail API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        fallbackUrl: ThumbnailService.getFallbackThumbnail(),
      },
      { status: 500 },
    )
  }
}
