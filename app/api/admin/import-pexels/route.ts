import { type NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  }
  initializeApp({ credential: cert(serviceAccount as any) })
}

const db = getFirestore()

// Pexels API key - you'll need to get one from https://www.pexels.com/api/
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "YOUR_PEXELS_API_KEY"

export async function POST(request: NextRequest) {
  try {
    const { searchTerms, videosPerTerm } = await request.json()

    let totalImported = 0

    for (const term of searchTerms) {
      console.log(`[Pexels] Fetching videos for: ${term}`)

      // Fetch videos from Pexels
      const response = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(term)}&per_page=${videosPerTerm}`,
        {
          headers: {
            Authorization: PEXELS_API_KEY,
          },
        },
      )

      if (!response.ok) {
        console.error(`[Pexels] Failed to fetch for term: ${term}`)
        continue
      }

      const data = await response.json()

      // Store each video in a temporary collection for bundling
      for (const video of data.videos) {
        const videoData = {
          id: `pexels_${video.id}`,
          title: `${term.charAt(0).toUpperCase() + term.slice(1)} Video ${video.id}`,
          description: `High-quality ${term} video from Pexels`,
          fileUrl: video.video_files[0]?.link || "",
          downloadUrl: video.video_files[0]?.link || "",
          thumbnailUrl: video.image || "",
          fileSize: video.video_files[0]?.size || 0,
          duration: video.duration || 0,
          mimeType: "video/mp4",
          contentType: "video",
          format: "mp4",
          quality: video.video_files[0]?.quality || "hd",
          tags: [term, "stock", "b-roll"],
          source: "pexels",
          sourceId: video.id.toString(),
          createdAt: new Date(),
          uploadedAt: new Date(),
        }

        await db.collection("marketplace_content_pool").doc(videoData.id).set(videoData)
        totalImported++
      }
    }

    console.log(`[Pexels] Imported ${totalImported} videos`)

    return NextResponse.json({
      success: true,
      imported: totalImported,
    })
  } catch (error: any) {
    console.error("[Pexels] Import error:", error)
    return NextResponse.json({ error: "Failed to import from Pexels", details: error.message }, { status: 500 })
  }
}
