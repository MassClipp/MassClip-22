import { type NextRequest, NextResponse } from "next/server"
import { transcribeVideo } from "@/lib/groq-transcription"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 })
    }

    console.log(`[v0] Transcribing from URL: ${url}`)

    const result = await transcribeVideo(url)
    const transcript = result.text || ""

    console.log(`[v0] Transcription complete: ${transcript.length} characters`)

    return NextResponse.json({
      transcript: transcript,
      duration: result.duration,
      language: result.language,
    })
  } catch (error) {
    console.error("[v0] Transcription error:", error)
    return NextResponse.json(
      { error: "Transcription failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
