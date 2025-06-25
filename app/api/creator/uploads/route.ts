import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Creator Uploads] Starting upload fetch...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Creator Uploads] No valid authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    try {
      // Verify the Firebase ID token
      const decodedToken = await getAuth().verifyIdToken(token)
      const userId = decodedToken.uid

      console.log("✅ [Creator Uploads] Authenticated user:", userId)

      // Query multiple collections for uploads
      const collections = ["uploads", "free_content", "videos", "content"]
      let allUploads: any[] = []

      for (const collectionName of collections) {
        try {
          console.log(`🔍 [Creator Uploads] Checking collection: ${collectionName}`)

          const snapshot = await db.collection(collectionName).where("uid", "==", userId).limit(50).get()

          if (!snapshot.empty) {
            const uploads = snapshot.docs.map((doc) => {
              const data = doc.data()
              return {
                id: doc.id,
                title: data.title || data.filename || "Untitled",
                filename: data.filename || data.title || "Unknown",
                fileUrl: data.fileUrl || data.url || "",
                thumbnailUrl: data.thumbnailUrl || data.thumbnail || "",
                mimeType: data.mimeType || data.type || "unknown",
                fileSize: data.fileSize || data.size || 0,
                duration: data.duration || 0,
                createdAt: data.createdAt || data.addedAt || new Date(),
                contentType: determineContentType(data.mimeType || data.type || ""),
                collection: collectionName,
                ...data,
              }
            })

            allUploads = [...allUploads, ...uploads]
            console.log(`✅ [Creator Uploads] Found ${uploads.length} uploads in ${collectionName}`)
          }
        } catch (collectionError) {
          console.log(`⚠️ [Creator Uploads] Error querying ${collectionName}:`, collectionError)
        }
      }

      // Remove duplicates based on fileUrl
      const uniqueUploads = allUploads.filter(
        (upload, index, self) => index === self.findIndex((u) => u.fileUrl === upload.fileUrl && upload.fileUrl !== ""),
      )

      // Sort by creation date (newest first)
      uniqueUploads.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })

      console.log(`✅ [Creator Uploads] Returning ${uniqueUploads.length} unique uploads`)

      return NextResponse.json({
        success: true,
        uploads: uniqueUploads,
        count: uniqueUploads.length,
        debug: {
          userId,
          collectionsChecked: collections,
          totalFound: allUploads.length,
          uniqueCount: uniqueUploads.length,
        },
      })
    } catch (authError) {
      console.error("❌ [Creator Uploads] Auth error:", authError)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
  } catch (error) {
    console.error("❌ [Creator Uploads] General error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch uploads",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function determineContentType(mimeType: string): "video" | "audio" | "image" | "document" {
  if (!mimeType) return "document"

  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}
