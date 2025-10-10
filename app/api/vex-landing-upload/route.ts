import { type NextRequest, NextResponse } from "next/server"
import { transcribeVideo } from "@/lib/groq-transcription"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString("base64")
    const dataUrl = `data:${file.type};base64,${base64}`

    console.log(`✅ [Landing Upload] Processing: ${file.name}`)

    // Transcribe if it's a video/audio file
    let transcript = null
    if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
      try {
        console.log(`🎤 [Landing Upload] Starting transcription...`)
        const result = await transcribeVideo(dataUrl)
        transcript = result.text
        console.log(`✅ [Landing Upload] Transcription complete: ${transcript.length} characters`)
      } catch (error) {
        console.error("❌ [Landing Upload] Transcription failed:", error)
        // Don't fail the upload if transcription fails
      }
    }

    return NextResponse.json({
      success: true,
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
