import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Discover Free Content] Starting discovery fetch from free_content collection only...")

    let allContent: any[] = []

    try {
      console.log("🔍 [Discover Free Content] Checking free_content collection")

      // Only query the free_content collection
      const snapshot = await db.collection("free_content").orderBy("createdAt", "desc").limit(50).get()

      if (!snapshot.empty) {
        const content = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data()

            // Get creator info
            let creatorName = "Unknown Creator"
            let creatorUsername = "unknown"

            if (data.uid) {
              try {
                const creatorProfile = await db.collection("users").doc(data.uid).get()
                if (creatorProfile.exists) {
                  const profile = creatorProfile.data()
                  creatorName = profile?.displayName || profile?.name || "Unknown Creator"
                  creatorUsername = profile?.username || "unknown"
                }
              } catch (profileError) {
                console.log(`⚠️ [Discover Free Content] Could not fetch creator profile for ${data.uid}`)
              }
            }

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
              collection: "free_content",
              uid: data.uid,
              creatorName,
              creatorUsername,
              views: data.views || 0,
              downloads: data.downloads || 0,
              ...data,
            }
          }),
        )

        allContent = content
        console.log(`✅ [Discover Free Content] Found ${content.length} items in free_content collection`)
      } else {
        console.log("📭 [Discover Free Content] No items found in free_content collection")
      }
    } catch (collectionError) {
      console.error(`❌ [Discover Free Content] Error querying free_content collection:`, collectionError)
      return NextResponse.json(
        {
          error: "Failed to query free_content collection",
          details: collectionError instanceof Error ? collectionError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    // Filter out items without valid file URLs
    const validContent = allContent.filter((item) => item.fileUrl && item.fileUrl !== "")

    console.log(`✅ [Discover Free Content] Returning ${validContent.length} valid items from free_content collection`)

    return NextResponse.json({
      success: true,
      videos: validContent,
      count: validContent.length,
      debug: {
        collectionUsed: "free_content",
        totalFound: allContent.length,
        validCount: validContent.length,
      },
    })
  } catch (error) {
    console.error("❌ [Discover Free Content] General error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch discover content",
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
