import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
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
    console.log("🔄 [Thumbnail Regeneration] POST request received")

    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { collection: collectionName = "videos", batchSize = 10 } = body

    console.log(`🔄 [Thumbnail Regeneration] Processing ${collectionName} collection`)

    try {
      // Get videos without thumbnails
      const videosRef = db.collection(collectionName)
      const query = videosRef.where("uid", "==", user.uid).limit(batchSize)

      const snapshot = await query.get()

      if (snapshot.empty) {
        return NextResponse.json({
          success: true,
          message: "No videos found to process",
          processed: 0,
        })
      }

      let processed = 0
      const batch = db.batch()

      for (const doc of snapshot.docs) {
        const data = doc.data()

        // Skip if already has thumbnail
        if (data.thumbnailUrl && !data.thumbnailUrl.includes("placeholder.svg")) {
          continue
        }

        // Generate fallback thumbnail URL
        const thumbnailUrl = getFallbackThumbnailUrl(data.title || data.filename || "video")

        // Update document
        batch.update(doc.ref, {
          thumbnailUrl,
          thumbnailWidth: 1280,
          thumbnailHeight: 720,
          thumbnailGenerated: true,
          thumbnailGeneratedAt: new Date(),
          updatedAt: new Date(),
        })

        processed++
        console.log(`🖼️ [Thumbnail Regeneration] Updated ${doc.id}: ${thumbnailUrl}`)
      }

      if (processed > 0) {
        await batch.commit()
        console.log(`✅ [Thumbnail Regeneration] Committed batch of ${processed} updates`)
      }

      return NextResponse.json({
        success: true,
        message: `Successfully processed ${processed} videos`,
        processed,
        hasMore: snapshot.docs.length === batchSize,
      })
    } catch (error) {
      console.error("❌ [Thumbnail Regeneration] Processing failed:", error)
      return NextResponse.json(
        {
          error: "Failed to regenerate thumbnails",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Thumbnail Regeneration] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
