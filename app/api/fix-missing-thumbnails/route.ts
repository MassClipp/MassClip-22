import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import {
  generateThumbnailFromVideoUrl,
  generateFallbackThumbnail,
  isCloudflareStreamUrl,
} from "@/lib/cloudflare-thumbnail-utils"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [Fix Thumbnails] Starting thumbnail fix process")

    const { collection: targetCollection = "uploads" } = await request.json().catch(() => ({}))

    // Get all documents from the specified collection
    const snapshot = await db.collection(targetCollection).get()
    console.log(`🔍 [Fix Thumbnails] Found ${snapshot.docs.length} documents in ${targetCollection}`)

    let fixedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data()

        // Skip if already has thumbnail or not a video
        if (data.thumbnailUrl || data.contentType !== "video" || data.type !== "video") {
          skippedCount++
          continue
        }

        // Skip if no fileUrl
        if (!data.fileUrl) {
          skippedCount++
          continue
        }

        console.log(`🖼️ [Fix Thumbnails] Processing ${doc.id}: ${data.title || data.filename}`)

        // Generate thumbnail URL
        let thumbnailUrl = generateThumbnailFromVideoUrl(data.fileUrl)

        if (!thumbnailUrl) {
          // Generate fallback thumbnail
          thumbnailUrl = generateFallbackThumbnail(data.filename, data.title)
        }

        // Update the document
        await doc.ref.update({
          thumbnailUrl,
          isCloudflareStream: isCloudflareStreamUrl(data.fileUrl),
          thumbnailFixedAt: new Date(),
        })

        console.log(`✅ [Fix Thumbnails] Fixed ${doc.id} with thumbnail: ${thumbnailUrl}`)
        fixedCount++
      } catch (error) {
        const errorMsg = `Failed to fix ${doc.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        console.error(`❌ [Fix Thumbnails] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    console.log(
      `🎉 [Fix Thumbnails] Complete! Fixed: ${fixedCount}, Skipped: ${skippedCount}, Errors: ${errors.length}`,
    )

    return NextResponse.json({
      success: true,
      fixed: fixedCount,
      skipped: skippedCount,
      errors,
      message: `Fixed ${fixedCount} thumbnails in ${targetCollection} collection`,
    })
  } catch (error) {
    console.error("❌ [Fix Thumbnails] Process failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix thumbnails",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
