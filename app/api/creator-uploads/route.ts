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

    // Query freeContent collection for this user instead of uploads
    const freeContentQuery = query(
      collection(db, "freeContent"),
      where("uid", "==", session.uid),
      orderBy("addedAt", "desc"),
      limit(50),
    )

    const freeContentSnapshot = await getDocs(freeContentQuery)
    const freeContent: any[] = []

    freeContentSnapshot.forEach((doc) => {
      const data = doc.data()
      freeContent.push({
        id: doc.id,
        ...data,
        // Ensure we have the required fields
        title: data.title || data.filename || data.originalFileName || "Untitled",
        filename: data.filename || data.originalFileName || `${doc.id}.file`,
        fileUrl: data.fileUrl || data.publicUrl || data.downloadUrl || "",
        thumbnailUrl: data.thumbnailUrl || "",
        mimeType: data.mimeType || data.fileType || "application/octet-stream",
        fileSize: data.fileSize || data.size || 0,
        createdAt: data.addedAt || data.createdAt || new Date(),
        // Add video-specific fields
        duration: data.duration || 0,
        aspectRatio: data.aspectRatio || "16:9",
        isVideo: data.type === "video" || data.mimeType?.startsWith("video/") || false,
        type: data.type || "unknown",
      })
    })

    console.log(`✅ [Creator Uploads] Found ${freeContent.length} free content items`)

    return NextResponse.json({
      success: true,
      uploads: freeContent,
      videos: freeContent.filter((item) => item.isVideo), // Filter only videos for backward compatibility
      count: freeContent.length,
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
