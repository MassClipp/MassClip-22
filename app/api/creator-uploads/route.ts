import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔍 [Creator Uploads] Fetching free content for user:", session.uid)

    try {
      // Query the free_content collection without ordering to avoid index issues
      const freeContentRef = db.collection("free_content")
      const query = freeContentRef.where("uid", "==", session.uid).limit(50)

      const snapshot = await query.get()
      console.log(`🔍 [Creator Uploads] Found ${snapshot.docs.length} documents`)

      // Map the documents to a more usable format
      const freeContent = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || "Untitled",
          fileUrl: data.fileUrl || "",
          type: data.type || "unknown",
          size: data.size || 0,
          addedAt: data.addedAt?.toDate?.() || data.addedAt,
          thumbnailUrl: data.thumbnailUrl || "",
          mimeType: data.mimeType || "",
          duration: data.duration || 0,
          aspectRatio: data.aspectRatio || "16:9",
          ...data, // Include all original data
        }
      })

      // Sort by addedAt (newest first) in JavaScript instead of Firestore
      const sortedContent = freeContent.sort((a, b) => {
        const dateA = new Date(a.addedAt || 0).getTime()
        const dateB = new Date(b.addedAt || 0).getTime()
        return dateB - dateA
      })

      console.log(`✅ [Creator Uploads] Processed ${sortedContent.length} free content items`)

      return NextResponse.json({
        success: true,
        freeContent: sortedContent,
        uploads: sortedContent, // For compatibility
        videos: sortedContent.filter((item) => item.type === "video"),
        count: sortedContent.length,
      })
    } catch (firestoreError) {
      console.error("❌ [Creator Uploads] Firestore error:", firestoreError)
      return NextResponse.json(
        {
          error: "Database error",
          details: firestoreError instanceof Error ? firestoreError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Creator Uploads] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch free content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
