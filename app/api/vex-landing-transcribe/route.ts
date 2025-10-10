import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { Buffer } from "buffer"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log(`[v0] Transcribing ${file.name} (${file.size} bytes)`)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create audio file for Groq (same as authenticated version)
    const audioFilename = file.name.replace(/\.(mp4|mov|avi|mkv|webm)$/i, ".mp3")
    const audioFile = new File([buffer], audioFilename, { type: "audio/mpeg" })

    // Call Groq Whisper with same settings as authenticated version
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      language: "en",
      response_format: "verbose_json",
      temperature: 0.0,
    })

    console.log(`[v0] Transcription complete: ${transcription.text?.length || 0} characters`)

    return NextResponse.json({
      transcript: transcription.text || "",
      duration: transcription.duration,
      language: transcription.language || "en",
    })
  } catch (error) {
    console.error("[v0] Transcription error:", error)
    return NextResponse.json(
      { error: "Transcription failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
