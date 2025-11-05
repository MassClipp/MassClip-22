import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-session"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Migration] Starting productBoxContent migration")

    const session = await getServerSession()
    if (!session?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let migratedCount = 0
    let errorCount = 0

    // Get all product boxes for this user
    const productBoxesSnapshot = await db.collection("productBoxes").where("creatorId", "==", session.uid).get()

    for (const productBoxDoc of productBoxesSnapshot.docs) {
      const productBoxData = productBoxDoc.data()
      const contentItems = productBoxData.contentItems || []

      console.log(`🔄 [Migration] Processing product box: ${productBoxDoc.id} with ${contentItems.length} items`)

      for (const uploadId of contentItems) {
        try {
          // Check if productBoxContent already exists
          const existingContent = await db
            .collection("productBoxContent")
            .where("productBoxId", "==", productBoxDoc.id)
            .where("uploadId", "==", uploadId)
            .get()

          if (!existingContent.empty) {
            console.log(`⏭️ [Migration] Skipping existing content: ${uploadId}`)
            continue
          }

          // Get upload data
          const uploadDoc = await db.collection("uploads").doc(uploadId).get()

          if (!uploadDoc.exists) {
            console.log(`❌ [Migration] Upload not found: ${uploadId}`)
            errorCount++
            continue
          }

          const uploadData = uploadDoc.data()

          // Create productBoxContent entry
          await db.collection("productBoxContent").add({
            productBoxId: productBoxDoc.id,
            uploadId: uploadId,
            title: uploadData?.title || uploadData?.filename || uploadData?.originalFileName || "Untitled",
            filename: uploadData?.filename || uploadData?.originalFileName || `${uploadId}.file`,
            fileUrl: uploadData?.fileUrl || uploadData?.publicUrl || uploadData?.downloadUrl || "",
            thumbnailUrl: uploadData?.thumbnailUrl || "",
            mimeType: uploadData?.mimeType || uploadData?.fileType || "application/octet-stream",
            fileSize: uploadData?.fileSize || uploadData?.size || 0,
            duration: uploadData?.duration || null,
            createdAt: new Date(),
            creatorId: session.uid,
          })

          migratedCount++
          console.log(`✅ [Migration] Migrated content: ${uploadId}`)
        } catch (error) {
          console.error(`❌ [Migration] Error migrating ${uploadId}:`, error)
          errorCount++
        }
      }
    }

    console.log(`✅ [Migration] Completed: ${migratedCount} migrated, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      migratedCount,
      errorCount,
      message: `Migration completed: ${migratedCount} items migrated, ${errorCount} errors`,
    })
  } catch (error) {
    console.error("❌ [Migration] Error:", error)
    return NextResponse.json(
      {
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
