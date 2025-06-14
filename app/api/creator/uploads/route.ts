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

    // Get category from query params
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    console.log("🔍 [Creator Uploads] Fetching uploads for user:", session.uid)
    console.log("🔍 [Creator Uploads] Category filter:", category)

    try {
      // Query the free_content collection (which contains public uploads)
      const freeContentRef = db.collection("free_content")

      // Build query conditionally based on category
      let query = freeContentRef.where("uid", "==", session.uid)

      if (category) {
        // Normalize category for matching
        const normalizedCategory = category.trim()
        console.log("🔍 [Creator Uploads] Filtering by category:", normalizedCategory)

        // Try multiple category field variations that might exist in your data
        query = query.where("category", "==", normalizedCategory)
      }

      // Limit results to prevent large responses
      query = query.limit(100)

      const snapshot = await query.get()
      console.log(`🔍 [Creator Uploads] Found ${snapshot.docs.length} documents`)

      if (snapshot.empty) {
        console.log("📭 [Creator Uploads] No documents found for query")
        return NextResponse.json({
          success: true,
          uploads: [],
          videos: [],
          count: 0,
          category: category || "all",
        })
      }

      // Map the documents to a usable format
      const uploads = snapshot.docs.map((doc) => {
        const data = doc.data()
        console.log("📄 [Creator Uploads] Processing doc:", doc.id, {
          title: data.title,
          category: data.category,
          type: data.type,
        })

        return {
          id: doc.id,
          title: data.title || "Untitled",
          fileUrl: data.fileUrl || "",
          type: data.type || "unknown",
          category: data.category || "uncategorized",
          size: data.size || 0,
          addedAt: data.addedAt?.toDate?.() || data.addedAt || new Date(),
          thumbnailUrl: data.thumbnailUrl || "",
          mimeType: data.mimeType || "",
          duration: data.duration || 0,
          aspectRatio: data.aspectRatio || "16:9",
          ...data, // Include all original data
        }
      })

      // Sort by addedAt (newest first)
      const sortedUploads = uploads.sort((a, b) => {
        const dateA = new Date(a.addedAt || 0).getTime()
        const dateB = new Date(b.addedAt || 0).getTime()
        return dateB - dateA
      })

      // Filter videos specifically
      const videos = sortedUploads.filter(
        (item) =>
          item.type === "video" ||
          item.mimeType?.startsWith("video/") ||
          item.fileUrl?.includes(".mp4") ||
          item.fileUrl?.includes(".mov") ||
          item.fileUrl?.includes(".avi"),
      )

      console.log(`✅ [Creator Uploads] Processed ${sortedUploads.length} uploads, ${videos.length} videos`)

      return NextResponse.json({
        success: true,
        uploads: sortedUploads,
        videos: videos,
        count: sortedUploads.length,
        videoCount: videos.length,
        category: category || "all",
        debug: {
          queryCategory: category,
          totalDocs: snapshot.docs.length,
          userId: session.uid,
        },
      })
    } catch (firestoreError) {
      console.error("❌ [Creator Uploads] Firestore error:", firestoreError)
      console.error("❌ [Creator Uploads] Error details:", {
        message: firestoreError instanceof Error ? firestoreError.message : "Unknown",
        stack: firestoreError instanceof Error ? firestoreError.stack : undefined,
        category: category,
        uid: session.uid,
      })

      return NextResponse.json(
        {
          error: "Database error",
          details: firestoreError instanceof Error ? firestoreError.message : "Unknown database error",
          category: category,
        },
        { status: 500 },
      )
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
