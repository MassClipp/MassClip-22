import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔍 [Creator Uploads] Fetching free content for user:", session.uid)

    // Use the exact same query structure as the free-content API
    const freeContentQuery = query(
      collection(db, "free_content"),
      where("uid", "==", session.uid),
      orderBy("addedAt", "desc"),
      limit(50),
    )

    const freeContentSnapshot = await getDocs(freeContentQuery)
    const freeContent: any[] = []

    console.log("📊 [Creator Uploads] Query results:", {
      totalDocs: freeContentSnapshot.size,
      uid: session.uid,
    })

    freeContentSnapshot.forEach((doc) => {
      const data = doc.data()
      console.log("📄 [Creator Uploads] Processing doc:", doc.id, data)

      freeContent.push({
        id: doc.id,
        title: data.title || "Untitled",
        fileUrl: data.fileUrl || "",
        type: data.type || "unknown",
        size: data.size || 0,
        addedAt: data.addedAt || new Date().toISOString(),
        thumbnailUrl: data.thumbnailUrl || "",
        mimeType: data.mimeType || "",
        duration: data.duration || 0,
        aspectRatio: data.aspectRatio || "16:9",
        ...data, // Include all original data
      })
    })

    console.log(`✅ [Creator Uploads] Processed ${freeContent.length} free content items`)

    return NextResponse.json({
      success: true,
      freeContent,
      uploads: freeContent, // For compatibility
      videos: freeContent.filter((item) => item.type === "video"),
      count: freeContent.length,
    })
  } catch (error) {
    console.error("❌ [Creator Uploads] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch free content",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
