import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { ThumbnailService } from "@/lib/thumbnail-service"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Fix Thumbnails] Starting thumbnail fix process")

    const { collection: collectionName = "uploads" } = await request.json().catch(() => ({}))

    console.log(`🔍 [Fix Thumbnails] Processing collection: ${collectionName}`)

    // Get all documents with invalid thumbnails
    const snapshot = await db.collection(collectionName).get()
    console.log(`🔍 [Fix Thumbnails] Found ${snapshot.docs.length} documents to check`)

    let fixed = 0
    let skipped = 0
    const errors: string[] = []

    const batch = db.batch()
    let batchCount = 0

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data()

        // Check if thumbnail is missing or invalid
        const needsFixing =
          !data.thumbnailUrl ||
          data.thumbnailUrl.includes("/placeholder.svg") ||
          data.thumbnailUrl === null ||
          data.thumbnailUrl === undefined

        if (!needsFixing) {
          skipped++
          continue
        }

        // Only process videos
        if (data.type !== "video" && data.contentType !== "video") {
          skipped++
          continue
        }

        console.log(`🖼️ [Fix Thumbnails] Fixing thumbnail for: ${data.filename || doc.id}`)

        // Generate new thumbnail
        const thumbnailResult = await ThumbnailService.generateThumbnail(
          data.fileUrl || data.publicUrl,
          data.filename || doc.id,
          { width: 480, height: 270, timeInSeconds: 1 },
        )

        if (thumbnailResult.success && thumbnailResult.thumbnailUrl) {
          // Update document with new thumbnail
          batch.update(doc.ref, {
            thumbnailUrl: thumbnailResult.thumbnailUrl,
            thumbnailSource: thumbnailResult.source,
            thumbnailFixedAt: new Date(),
          })

          fixed++
          batchCount++

          console.log(`✅ [Fix Thumbnails] Fixed ${doc.id}: ${thumbnailResult.thumbnailUrl}`)

          // Commit batch every 500 operations
          if (batchCount >= 500) {
            await batch.commit()
            console.log(`📦 [Fix Thumbnails] Committed batch of ${batchCount} updates`)
            batchCount = 0
          }
        } else {
          errors.push(`Failed to generate thumbnail for ${data.filename || doc.id}: ${thumbnailResult.error}`)
        }
      } catch (error) {
        const errorMsg = `Error processing ${doc.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        console.error(`❌ [Fix Thumbnails] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit()
      console.log(`📦 [Fix Thumbnails] Committed final batch of ${batchCount} updates`)
    }

    const message = `Fixed ${fixed} thumbnails, skipped ${skipped} items`
    console.log(`✅ [Fix Thumbnails] Complete: ${message}`)

    return NextResponse.json({
      success: true,
      message,
      fixed,
      skipped,
      errors,
    })
  } catch (error) {
    console.error("❌ [Fix Thumbnails] Error:", error)
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
