import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user session
    const session = await getServerSession()
    if (!session?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔍 [Creator Uploads] Fetching free content for user:", session.uid)

    // Simple query to get user's free content
    const freeContentSnapshot = await db.collection("free_content").where("uid", "==", session.uid).limit(50).get()

    console.log(`📊 [Creator Uploads] Found ${freeContentSnapshot.size} free content items`)

    // Map the results
    const videos = []
    freeContentSnapshot.forEach((doc) => {
      const data = doc.data()
      videos.push({
        id: doc.id,
        title: data.title || "Untitled",
        fileUrl: data.fileUrl || "",
        thumbnailUrl: data.thumbnailUrl || "",
        type: data.type || "video",
        duration: data.duration || 0,
        size: data.size || 0,
        addedAt: data.addedAt,
        ...data,
      })
    })

    console.log(`✅ [Creator Uploads] Returning ${videos.length} videos`)

    return NextResponse.json({
      success: true,
      videos: videos,
      count: videos.length,
    })
  } catch (error) {
    console.error("❌ [Creator Uploads] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch creator uploads",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
