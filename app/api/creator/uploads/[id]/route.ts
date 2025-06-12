import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-session"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Creator Uploads API] Fetching upload: ${params.id}`)

    const session = await getServerSession()
    if (!session?.uid) {
      console.log("❌ [Creator Uploads API] Unauthorized - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get upload document
    const uploadDoc = await db.collection("uploads").doc(params.id).get()

    if (!uploadDoc.exists) {
      console.log(`❌ [Creator Uploads API] Upload not found: ${params.id}`)
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    const uploadData = uploadDoc.data()

    // Check if user owns this upload
    if (uploadData?.uid !== session.uid) {
      console.log(`❌ [Creator Uploads API] Access denied for user ${session.uid} to upload ${params.id}`)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Return normalized upload data
    const normalizedData = {
      id: uploadDoc.id,
      title: uploadData.title || uploadData.filename || uploadData.originalFileName || "Untitled",
      filename: uploadData.filename || uploadData.originalFileName || `${uploadDoc.id}.file`,
      fileUrl: uploadData.fileUrl || uploadData.publicUrl || uploadData.downloadUrl || "",
      thumbnailUrl: uploadData.thumbnailUrl || "",
      mimeType: uploadData.mimeType || uploadData.fileType || "application/octet-stream",
      fileSize: uploadData.fileSize || uploadData.size || 0,
      duration: uploadData.duration || null,
      createdAt: uploadData.createdAt || uploadData.uploadedAt,
      uid: uploadData.uid,
    }

    console.log(`✅ [Creator Uploads API] Successfully fetched upload: ${params.id}`)
    return NextResponse.json(normalizedData)
  } catch (error) {
    console.error(`❌ [Creator Uploads API] Error fetching upload ${params.id}:`, error)

    if (error instanceof Error) {
      console.error("❌ [Creator Uploads API] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
        uploadId: params.id,
      })
    }

    return NextResponse.json(
      {
        error: "Failed to fetch upload",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
