import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Discover Free Content] Starting discovery fetch...")

    // Query multiple collections for free content from ALL creators
    const collections = ["free_content", "uploads", "videos", "content"]
    let allContent: any[] = []

    for (const collectionName of collections) {
      try {
        console.log(`🔍 [Discover Free Content] Checking collection: ${collectionName}`)

        // Get all free content (no user filtering)
        let query = db.collection(collectionName).limit(100)

        // Only get free/public content
        if (collectionName === "uploads" || collectionName === "content") {
          query = query.where("isFree", "==", true)
        }

        const snapshot = await query.get()

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
                collection: collectionName,
                uid: data.uid,
                creatorName,
                creatorUsername,
                ...data,
              }
            }),
          )

          allContent = [...allContent, ...content]
          console.log(`✅ [Discover Free Content] Found ${content.length} items in ${collectionName}`)
        }
      } catch (collectionError) {
        console.log(`⚠️ [Discover Free Content] Error querying ${collectionName}:`, collectionError)
      }
    }

    // Remove duplicates based on fileUrl
    const uniqueContent = allContent.filter(
      (item, index, self) => index === self.findIndex((i) => i.fileUrl === item.fileUrl && item.fileUrl !== ""),
    )

    // Sort by creation date (newest first)
    uniqueContent.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA
    })

    console.log(`✅ [Discover Free Content] Returning ${uniqueContent.length} unique items from all creators`)

    return NextResponse.json({
      success: true,
      videos: uniqueContent,
      count: uniqueContent.length,
      debug: {
        collectionsChecked: collections,
        totalFound: allContent.length,
        uniqueCount: uniqueContent.length,
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
