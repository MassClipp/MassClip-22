import { type NextRequest, NextResponse } from "next/server"
import { transcribeVideo } from "@/lib/groq-transcription"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Convert file to buffer and create temporary URL
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create a data URL for transcription
    const base64 = buffer.toString("base64")
    const mimeType = file.type || "video/mp4"
    const dataUrl = `data:${mimeType};base64,${base64}`

    console.log(`[v0] Transcribing ${file.name} (${file.size} bytes)`)

    // Transcribe using Groq
    const result = await transcribeVideo(dataUrl)

    console.log(`[v0] Transcription complete: ${result.text.length} characters`)

    return NextResponse.json({
      transcript: result.text,
      duration: result.duration,
      language: result.language,
    })
  } catch (error) {
    console.error("[v0] Transcription error:", error)
    return NextResponse.json({ error: "Transcription failed", transcript: "" }, { status: 500 })
  }
}
