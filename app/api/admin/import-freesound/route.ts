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

// Freesound API key - get one from https://freesound.org/apiv2/apply/
const FREESOUND_API_KEY = process.env.FREESOUND_API_KEY || "YOUR_FREESOUND_API_KEY"

export async function POST(request: NextRequest) {
  try {
    const { tags, soundsPerTag } = await request.json()

    let totalImported = 0

    for (const tag of tags) {
      console.log(`[Freesound] Fetching sounds for: ${tag}`)

      // Fetch sounds from Freesound
      const response = await fetch(
        `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(tag)}&page_size=${soundsPerTag}&token=${FREESOUND_API_KEY}`,
      )

      if (!response.ok) {
        console.error(`[Freesound] Failed to fetch for tag: ${tag}`)
        continue
      }

      const data = await response.json()

      // Store each sound in a temporary collection for bundling
      for (const sound of data.results) {
        const soundData = {
          id: `freesound_${sound.id}`,
          title: sound.name,
          description: sound.description || `${tag} sound effect`,
          fileUrl: sound.previews?.["preview-hq-mp3"] || sound.previews?.["preview-lq-mp3"] || "",
          downloadUrl: sound.previews?.["preview-hq-mp3"] || sound.previews?.["preview-lq-mp3"] || "",
          thumbnailUrl: "/placeholder.svg?height=200&width=200",
          fileSize: sound.filesize || 0,
          duration: sound.duration || 0,
          mimeType: "audio/mpeg",
          contentType: "audio",
          format: "mp3",
          quality: "hq",
          tags: [tag, "sound-effect", "audio"],
          source: "freesound",
          sourceId: sound.id.toString(),
          createdAt: new Date(),
          uploadedAt: new Date(),
        }

        await db.collection("marketplace_content_pool").doc(soundData.id).set(soundData)
        totalImported++
      }
    }

    console.log(`[Freesound] Imported ${totalImported} sounds`)

    return NextResponse.json({
      success: true,
      imported: totalImported,
    })
  } catch (error: any) {
    console.error("[Freesound] Import error:", error)
    return NextResponse.json({ error: "Failed to import from Freesound", details: error.message }, { status: 500 })
  }
}
