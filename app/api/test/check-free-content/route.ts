import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Check Free Content] Checking free_content collection...")

    // Check free_content collection
    const freeContentRef = db.collection("free_content")
    const freeContentSnapshot = await freeContentRef.get()

    console.log(`📊 [Check Free Content] Free content entries: ${freeContentSnapshot.docs.length}`)

    // Get sample data
    const sampleFreeContent = []

    for (const doc of freeContentSnapshot.docs.slice(0, 5)) {
      const freeContentData = doc.data()

      // Get the referenced upload
      let uploadData = null
      if (freeContentData.uploadId) {
        try {
          const uploadDoc = await db.collection("uploads").doc(freeContentData.uploadId).get()
          if (uploadDoc.exists) {
            uploadData = uploadDoc.data()
          }
        } catch (uploadError) {
          console.error(`Error fetching upload ${freeContentData.uploadId}:`, uploadError)
        }
      }

      sampleFreeContent.push({
        freeContentId: doc.id,
        freeContentData,
        uploadData,
      })
    }

    return NextResponse.json({
      freeContentEntries: freeContentSnapshot.docs.length,
      sampleFreeContent,
      message:
        freeContentSnapshot.docs.length === 0
          ? "No free content entries found. Add content via /dashboard/free-content"
          : `Found ${freeContentSnapshot.docs.length} free content entries`,
    })
  } catch (error) {
    console.error("❌ [Check Free Content] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to check free content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
