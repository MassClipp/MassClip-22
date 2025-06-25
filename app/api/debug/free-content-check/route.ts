import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Debug Free Content] Starting diagnostic...")

    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 })
    }

    // Get ALL documents from free_content collection
    const snapshot = await db.collection("free_content").get()

    const documents = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      documents.push({
        id: doc.id,
        title: data.title || "No title",
        uid: data.uid || "No UID",
        fileUrl: data.fileUrl || data.url || "No URL",
        addedAt: data.addedAt?.toDate?.() || data.addedAt || "No date",
        hasRequiredFields: !!(data.uid && (data.fileUrl || data.url)),
      })
    })

    return NextResponse.json({
      totalDocuments: snapshot.size,
      documents: documents,
      validDocuments: documents.filter((d) => d.hasRequiredFields).length,
    })
  } catch (error) {
    console.error("❌ [Debug Free Content] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
