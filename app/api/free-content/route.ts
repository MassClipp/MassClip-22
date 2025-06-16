import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import {
  generateThumbnailFromVideoUrl,
  generateFallbackThumbnail,
  isCloudflareStreamUrl,
} from "@/lib/cloudflare-thumbnail-utils"

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

// GET /api/free-content - Fetch free content
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Free Content API] GET request received")

    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get("creatorId")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    let query = db.collection("free_content")

    if (creatorId) {
      query = query.where("uid", "==", creatorId)
    }

    // Order by creation date (newest first)
    query = query.orderBy("createdAt", "desc").limit(limit)

    const snapshot = await query.get()
    console.log(`🔍 [Free Content API] Found ${snapshot.docs.length} documents`)

    const freeContent = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      }
    })

    console.log(`✅ [Free Content API] Returning ${freeContent.length} free content items`)
    return NextResponse.json({ freeContent })
  } catch (error) {
    console.error("❌ [Free Content API] Error fetching free content:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch free content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// POST /api/free-content - Move upload to free content
export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Free Content API] POST request received")

    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { uploadId } = await request.json()

    if (!uploadId) {
      return NextResponse.json({ error: "Upload ID is required" }, { status: 400 })
    }

    // Get the upload document
    const uploadDoc = await db.collection("uploads").doc(uploadId).get()

    if (!uploadDoc.exists) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    const uploadData = uploadDoc.data()!

    // Verify ownership
    if (uploadData.uid !== user.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Generate thumbnail if missing and it's a video
    let thumbnailUrl = uploadData.thumbnailUrl

    if (!thumbnailUrl && uploadData.contentType === "video" && uploadData.fileUrl) {
      console.log("🖼️ [Free Content] Generating thumbnail for video:", uploadData.fileUrl)

      const cloudflareThumb = generateThumbnailFromVideoUrl(uploadData.fileUrl)

      if (cloudflareThumb) {
        thumbnailUrl = cloudflareThumb
        console.log("✅ [Free Content] Generated Cloudflare Stream thumbnail:", thumbnailUrl)
      } else {
        thumbnailUrl = generateFallbackThumbnail(uploadData.filename, uploadData.title)
        console.log("📷 [Free Content] Generated fallback thumbnail:", thumbnailUrl)
      }
    }

    // Create free content document with enhanced metadata
    const freeContentData = {
      ...uploadData,
      thumbnailUrl, // Ensure thumbnail is included
      isCloudflareStream: isCloudflareStreamUrl(uploadData.fileUrl || ""),
      movedToFreeAt: new Date(),
      originalUploadId: uploadId,
    }

    // Add to free_content collection
    const freeContentRef = await db.collection("free_content").add(freeContentData)

    // Delete from uploads collection
    await db.collection("uploads").doc(uploadId).delete()

    console.log(`✅ [Free Content] Moved upload ${uploadId} to free content ${freeContentRef.id}`)

    return NextResponse.json({
      id: freeContentRef.id,
      ...freeContentData,
    })
  } catch (error) {
    console.error("❌ [Free Content API] Error moving to free content:", error)
    return NextResponse.json(
      {
        error: "Failed to move to free content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
