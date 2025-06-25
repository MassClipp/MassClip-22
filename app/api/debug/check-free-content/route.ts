import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Debug Free Content] Starting debug check...")

    if (!db) {
      return NextResponse.json({
        success: false,
        error: "Database not initialized",
      })
    }

    // Get ALL documents from free_content collection
    const freeContentRef = db.collection("free_content")
    const snapshot = await freeContentRef.get()

    console.log(`📊 [Debug Free Content] Total documents: ${snapshot.size}`)

    const documents = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      documents.push({
        id: doc.id,
        title: data.title || "No title",
        uid: data.uid || "No UID",
        fileUrl: data.fileUrl || "No URL",
        addedAt: data.addedAt,
        sourceCollection: data.sourceCollection,
        originalId: data.originalId,
      })
      console.log(`📄 [Debug Free Content] Document ${doc.id}:`, {
        title: data.title,
        uid: data.uid,
        hasFileUrl: !!data.fileUrl,
        sourceCollection: data.sourceCollection,
        originalId: data.originalId,
      })
    })

    return NextResponse.json({
      success: true,
      totalDocuments: snapshot.size,
      documents: documents,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ [Debug Free Content] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
