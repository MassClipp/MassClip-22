import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { transcribeVideo } from "@/lib/groq-transcription"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(`landing-uploads/${Date.now()}-${file.name}`, file, {
      access: "public",
    })

    console.log(`✅ [Landing Upload] Uploaded: ${blob.url}`)

    // Transcribe if it's a video/audio file
    let transcript = null
    if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
      try {
        console.log(`🎤 [Landing Upload] Starting transcription...`)
        const result = await transcribeVideo(blob.url)
        transcript = result.text
        console.log(`✅ [Landing Upload] Transcription complete: ${transcript.length} characters`)
      } catch (error) {
        console.error("❌ [Landing Upload] Transcription failed:", error)
        // Don't fail the upload if transcription fails
      }
    }

    return NextResponse.json({
      success: true,
      url: blob.url,
      name: file.name,
      size: file.size,
      type: file.type,
      transcript,
    })
  } catch (error) {
    console.error("❌ [Landing Upload] Error:", error)
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
