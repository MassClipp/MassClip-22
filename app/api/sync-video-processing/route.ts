import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { updateVideoVimeoData } from "@/lib/video-catalog-manager"

export async function GET(request: Request) {
  try {
    // Get videos that are in processing status
    const q = query(collection(db, "videos"), where("status", "==", "processing"))
    const querySnapshot = await getDocs(q)

    const processingVideos = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`Found ${processingVideos.length} videos in processing status`)

    // For each processing video, check its status on Vimeo
    const results = await Promise.all(
      processingVideos.map(async (video) => {
        try {
          const response = await fetch(`/api/vimeo/video-status/${video.vimeoId}`)

          if (!response.ok) {
            throw new Error(`Failed to fetch video status: ${response.statusText}`)
          }

          const vimeoData = await response.json()

          // If the video is ready, update its status in our catalog
          if (vimeoData.status === "available") {
            await updateVideoVimeoData(video.id, vimeoData)
            return { id: video.id, status: "updated" }
          }

          return { id: video.id, status: "still-processing" }
        } catch (error) {
          console.error(`Error checking video ${video.id}:`, error)
          return { id: video.id, status: "error", error }
        }
      }),
    )

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error("Error syncing video processing status:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
