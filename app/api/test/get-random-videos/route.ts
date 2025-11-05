import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("[Test API] Fetching random videos from Firestore...")

    // Query creatorUploads collection for videos
    const uploadsSnapshot = await adminDb
      .collection("creatorUploads")
      .where("contentType", "==", "video")
      .where("fileUrl", "!=", "")
      .limit(50) // Get more than we need so we can randomize
      .get()

    if (uploadsSnapshot.empty) {
      console.log("[Test API] No videos found, using fallback URLs")
      // Return fallback test videos if no real ones found
      return NextResponse.json({
        success: true,
        videos: [
          {
            id: "fallback-1",
            title: "Sample Video 1 - Big Buck Bunny",
            fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            downloadUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            thumbnailUrl: "/placeholder.svg?height=720&width=405",
            contentType: "video",
            mimeType: "video/mp4",
            fileType: "mp4",
            size: 5253880,
            duration: 596,
            createdAt: new Date().toISOString(),
          },
          {
            id: "fallback-2",
            title: "Sample Video 2 - Elephants Dream",
            fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            downloadUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            thumbnailUrl: "/placeholder.svg?height=720&width=405",
            contentType: "video",
            mimeType: "video/mp4",
            fileType: "mp4",
            size: 4855000,
            duration: 653,
            createdAt: new Date().toISOString(),
          },
          {
            id: "fallback-3",
            title: "Sample Video 3 - For Bigger Blazes",
            fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            downloadUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            thumbnailUrl: "/placeholder.svg?height=720&width=405",
            contentType: "video",
            mimeType: "video/mp4",
            fileType: "mp4",
            size: 2299653,
            duration: 15,
            createdAt: new Date().toISOString(),
          },
        ],
      })
    }

    // Get all videos and shuffle
    const allVideos = uploadsSnapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || data.name || `Video ${doc.id.slice(0, 8)}`,
          fileUrl: data.fileUrl || data.publicUrl || data.downloadUrl || "",
          downloadUrl: data.downloadUrl || data.fileUrl || data.publicUrl || "",
          thumbnailUrl: data.thumbnailUrl || "/placeholder.svg?height=720&width=405",
          contentType: data.contentType || "video",
          mimeType: data.mimeType || "video/mp4",
          fileType: data.fileType || "mp4",
          size: data.size || 0,
          duration: data.duration || 0,
          createdAt: data.createdAt || new Date().toISOString(),
        }
      })
      .filter((video) => video.fileUrl) // Only include videos with valid URLs

    // Shuffle and take 3
    const shuffled = allVideos.sort(() => Math.random() - 0.5)
    const selectedVideos = shuffled.slice(0, 3)

    console.log(`[Test API] Found ${allVideos.length} videos, selected 3 random ones`)

    return NextResponse.json({
      success: true,
      videos: selectedVideos,
      totalAvailable: allVideos.length,
    })
  } catch (error) {
    console.error("[Test API] Error fetching videos:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch videos",
      },
      { status: 500 },
    )
  }
}
