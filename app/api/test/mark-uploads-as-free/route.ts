import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    console.log("🎬 [Mark Uploads as Free] Starting to mark uploads as free content...")

    // Get the first 10 uploads that aren't already marked as free content
    const uploadsRef = db.collection("uploads").limit(10)
    const snapshot = await uploadsRef.get()

    if (snapshot.empty) {
      console.log("📭 [Mark Uploads as Free] No uploads found")
      return NextResponse.json({
        message: "No uploads found to mark as free content",
        markedCount: 0,
      })
    }

    console.log(`🎬 [Mark Uploads as Free] Found ${snapshot.docs.length} uploads to process`)

    let markedCount = 0
    const batch = db.batch()

    for (const doc of snapshot.docs) {
      const uploadData = doc.data()

      // Only mark as free if not already marked
      if (!uploadData.isFreeContent) {
        batch.update(doc.ref, {
          isFreeContent: true,
          updatedAt: new Date(),
        })
        markedCount++
        console.log(
          `✅ [Mark Uploads as Free] Marking ${uploadData.title || uploadData.filename || doc.id} as free content`,
        )
      }
    }

    if (markedCount > 0) {
      await batch.commit()
      console.log(`🎉 [Mark Uploads as Free] Successfully marked ${markedCount} uploads as free content`)
    } else {
      console.log("ℹ️ [Mark Uploads as Free] No uploads needed to be marked (all already free)")
    }

    return NextResponse.json({
      message: `Successfully marked ${markedCount} uploads as free content`,
      markedCount,
      totalProcessed: snapshot.docs.length,
    })
  } catch (error) {
    console.error("❌ [Mark Uploads as Free] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to mark uploads as free content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
