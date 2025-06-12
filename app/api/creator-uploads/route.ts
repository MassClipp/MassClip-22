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

    console.log("🔍 [Creator Uploads] Fetching uploads for user:", session.uid)

    // Query uploads collection for this user
    const uploadsQuery = query(
      collection(db, "uploads"),
      where("uid", "==", session.uid),
      orderBy("createdAt", "desc"),
      limit(50),
    )

    const uploadsSnapshot = await getDocs(uploadsQuery)
    const uploads: any[] = []

    uploadsSnapshot.forEach((doc) => {
      const data = doc.data()
      uploads.push({
        id: doc.id,
        ...data,
        // Ensure we have the required fields
        title: data.title || data.filename || data.originalFileName || "Untitled",
        filename: data.filename || data.originalFileName || `${doc.id}.file`,
        fileUrl: data.fileUrl || data.publicUrl || data.downloadUrl || "",
        thumbnailUrl: data.thumbnailUrl || "",
        mimeType: data.mimeType || data.fileType || "application/octet-stream",
        fileSize: data.fileSize || data.size || 0,
      })
    })

    console.log(`✅ [Creator Uploads] Found ${uploads.length} uploads`)

    return NextResponse.json({
      success: true,
      uploads,
      count: uploads.length,
    })
  } catch (error) {
    console.error("❌ [Creator Uploads] Error:", error)
    return NextResponse.json({ error: "Failed to fetch uploads" }, { status: 500 })
  }
}
