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

    // Query the free_content collection
    const freeContentRef = db.collection("free_content")
    const query = freeContentRef.where("uid", "==", session.uid).limit(50)

    const snapshot = await query.get()
    console.log(`🔍 [Creator Uploads] Found ${snapshot.docs.length} documents`)

    const freeContent = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        addedAt: data.addedAt?.toDate?.() || data.addedAt,
      }
    })

    // Sort by addedAt (newest first)
    const sortedContent = freeContent.sort((a, b) => {
      const dateA = new Date(a.addedAt || 0).getTime()
      const dateB = new Date(b.addedAt || 0).getTime()
      return dateB - dateA
    })

    console.log(`✅ [Creator Uploads] Processed ${sortedContent.length} free content items`)

    return NextResponse.json({
      success: true,
      videos: sortedContent,
      count: sortedContent.length,
    })
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
