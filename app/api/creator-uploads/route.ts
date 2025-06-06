import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import type { VimeoVideo } from "@/lib/types"

// Initialize Firebase Admin
initializeFirebaseAdmin()

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Convert upload data to VimeoVideo format for consistency with VideoRow
function convertToVimeoVideo(upload: any): VimeoVideo {
  return {
    uri: `/videos/${upload.id}`,
    name: upload.title || upload.filename || "Untitled",
    description: upload.description || "",
    link: upload.fileUrl || "",
    duration: upload.duration || 0,
    width: 1080,
    height: 1920,
    created_time: upload.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    modified_time: upload.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    release_time: upload.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    embed: {
      html: "",
      badges: {
        hdr: false,
        live: { streaming: false, archived: false },
        staff_pick: { normal: false, best_of_the_month: false, best_of_the_year: false, premiere: false },
        vod: false,
        weekend_challenge: false,
      },
      buttons: {
        like: true,
        watchlater: true,
        share: true,
        embed: true,
        hd: true,
        fullscreen: true,
        scaling: true,
      },
      logos: {
        vimeo: true,
        custom: { active: false, url: null, link: null, sticky: false },
      },
      title: { name: "string", owner: "string", portrait: "string" },
    },
    pictures: {
      uri: "",
      active: true,
      type: "custom",
      base_link: "",
      sizes: [
        {
          width: 1080,
          height: 1920,
          link: upload.thumbnailUrl || "/placeholder.svg?height=1920&width=1080",
          link_with_play_button: upload.thumbnailUrl || "/placeholder.svg?height=1920&width=1080",
        },
      ],
    },
    tags: upload.tags || [],
    stats: { plays: upload.views || 0 },
    categories: [],
    user: {
      uri: `/users/${upload.uid}`,
      name: upload.userDisplayName || upload.username || "Creator",
      link: "",
      location: "",
      bio: "",
      created_time: "",
      pictures: {
        uri: "",
        active: true,
        type: "default",
        base_link: "",
        sizes: [],
      },
      websites: [],
      metadata: {
        connections: {
          albums: { uri: "", options: [], total: 0 },
          appearances: { uri: "", options: [], total: 0 },
          channels: { uri: "", options: [], total: 0 },
          feed: { uri: "", options: [] },
          followers: { uri: "", options: [], total: 0 },
          following: { uri: "", options: [], total: 0 },
          groups: { uri: "", options: [], total: 0 },
          likes: { uri: "", options: [], total: 0 },
          membership: { uri: "", options: [] },
          moderated_channels: { uri: "", options: [], total: 0 },
          portfolios: { uri: "", options: [], total: 0 },
          videos: { uri: "", options: [], total: 0 },
          watchlater: { uri: "", options: [], total: 0 },
          shared: { uri: "", options: [], total: 0 },
          pictures: { uri: "", options: [], total: 0 },
          watched_videos: { uri: "", options: [], total: 0 },
        },
      },
      location_details: {
        formatted_address: "",
        latitude: 0,
        longitude: 0,
        city: "",
        state: "",
        neighborhood: "",
        sub_locality: "",
        state_iso_code: "",
        country: "",
        country_iso_code: "",
      },
      skills: [],
      available_for_hire: false,
      can_work_remotely: false,
      resource_key: "",
      account: "basic",
    },
    app: { name: "MassClip", uri: "/apps/massclip" },
    status: "available",
    resource_key: "",
    upload: {
      status: "complete",
      upload_link: null,
      form: null,
      complete_uri: null,
      approach: null,
      size: null,
      redirect_url: null,
    },
    transcode: { status: "complete" },
    is_playable: true,
    has_audio: true,
    download: upload.fileUrl
      ? [
          {
            quality: "hd",
            type: "video/mp4",
            width: 1080,
            height: 1920,
            link: upload.fileUrl,
            size: 0,
          },
        ]
      : undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    // Add cache control headers to ensure fresh data
    const headers = {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    }

    console.log("🎬 [Creator Uploads API] Fetching fresh content from free_content collection...")

    // Get all free content entries (same as /dashboard/free-content page)
    const freeContentRef = db.collection("free_content")
    const freeContentSnapshot = await freeContentRef.get()

    if (freeContentSnapshot.empty) {
      console.log("📭 [Creator Uploads API] No free content entries found")
      return NextResponse.json({ videos: [] }, { headers })
    }

    console.log(`🎬 [Creator Uploads API] Found ${freeContentSnapshot.docs.length} free content entries`)

    // Get the upload data for each free content entry
    const processedContent = []

    for (const freeContentDoc of freeContentSnapshot.docs) {
      const freeContentData = freeContentDoc.data()

      try {
        // Get the actual upload data - ALWAYS fetch fresh from database
        let uploadData = null
        if (freeContentData.uploadId) {
          const uploadDoc = await db.collection("uploads").doc(freeContentData.uploadId).get()
          if (uploadDoc.exists) {
            uploadData = { id: uploadDoc.id, ...uploadDoc.data() }
            console.log(
              `🔄 [Creator Uploads] Fresh data for ${uploadData.title || "Untitled"}: ${uploadData.updatedAt?.toDate?.()?.toISOString() || "No update time"}`,
            )
          }
        }

        if (uploadData) {
          // Calculate performance score (downloads * 2 + views)
          const views = uploadData.views || 0
          const downloads = uploadData.downloads || 0
          const performanceScore = downloads * 2 + views

          processedContent.push({
            ...uploadData,
            freeContentId: freeContentDoc.id,
            addedToFreeAt: freeContentData.addedAt,
            performanceScore,
            views,
            downloads,
          })

          console.log(
            `📊 [Creator Uploads] ${uploadData.title || "Untitled"}: ${views} views, ${downloads} downloads, score: ${performanceScore}`,
          )
        }
      } catch (error) {
        console.error(`❌ [Creator Uploads] Error processing ${freeContentDoc.id}:`, error)
      }
    }

    if (processedContent.length === 0) {
      console.log("📭 [Creator Uploads API] No valid content found after processing")
      return NextResponse.json({ videos: [] }, { headers })
    }

    // Sort by performance score (descending)
    const sortedContent = processedContent.sort((a, b) => b.performanceScore - a.performanceScore)

    // Take top 25 for the row
    const topContent = sortedContent.slice(0, 25)

    // Implement ranking strategy:
    // - Keep top 5 locked at the top
    // - Shuffle the next 20
    const lockedTop5 = topContent.slice(0, 5)
    const shuffleableRest = topContent.slice(5)
    const shuffledRest = shuffleArray(shuffleableRest)

    // Combine locked top 5 + shuffled rest
    const finalOrder = [...lockedTop5, ...shuffledRest]

    console.log(`🎬 [Creator Uploads API] Returning ${finalOrder.length} videos (top 5 locked, rest shuffled)`)
    console.log(
      `🔒 [Creator Uploads API] Top 5 locked:`,
      lockedTop5.map((c) => c.title || "Untitled"),
    )

    // Convert to VimeoVideo format for compatibility with VideoRow
    const vimeoVideos = finalOrder.map((item) => convertToVimeoVideo(item))

    return NextResponse.json(
      {
        videos: vimeoVideos,
        total: finalOrder.length,
        strategy: {
          locked: lockedTop5.length,
          shuffled: shuffledRest.length,
          totalProcessed: processedContent.length,
        },
        timestamp: new Date().toISOString(), // Add timestamp for debugging
      },
      { headers },
    )
  } catch (error) {
    console.error("❌ [Creator Uploads API] Error fetching creator uploads:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch creator uploads",
        details: error instanceof Error ? error.message : "Unknown error",
        videos: [],
      },
      { status: 500 },
    )
  }
}
