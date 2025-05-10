import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { vimeoConfig } from "@/lib/vimeo-config"
import { updateVideoVimeoData } from "@/lib/video-catalog-manager"

// This endpoint will sync the processing status of recently uploaded videos
export async function GET() {
  try {
    // Get videos that might still be processing (uploaded in the last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const q = query(
      collection(db, "videos"),
      where("status", "==", "processing"),
      limit(10), // Process 10 at a time to avoid overloading
    )

    const querySnapshot = await getDocs(q)
    const videos = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`Found ${videos.length} videos to check processing status`)

    const results = await Promise.all(
      videos.map(async (video) => {
        try {
          // Fetch the latest data from Vimeo
          const response = await fetch(`https://api.vimeo.com/videos/${video.vimeoId}`, {
            headers: {
              Authorization: `Bearer ${vimeoConfig.accessToken}`,
              "Content-Type": "application/json",
              Accept: "application/vnd.vimeo.*+json;version=3.4",
            },
          })

          if (!response.ok) {
            console.error(`Error fetching video ${video.vimeoId} from Vimeo:`, await response.text())
            return {
              id: video.id,
              success: false,
              error: `Vimeo API error: ${response.status}`,
            }
          }

          const vimeoData = await response.json()

          // Update our catalog with the latest Vimeo data
          await updateVideoVimeoData(video.id, vimeoData)

          return {
            id: video.id,
            success: true,
            status: vimeoData.transcode.status,
          }
        } catch (error) {
          console.error(`Error processing video ${video.id}:`, error)
          return {
            id: video.id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }
        }
      }),
    )

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error("Error in sync-video-processing:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
