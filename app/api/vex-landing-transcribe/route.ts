import { type NextRequest, NextResponse } from "next/server"
import { transcribeVideo } from "@/lib/groq-transcription"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 })
    }

    console.log(`[v0] Transcribing from URL: ${url}`)

    let lastError: Error | null = null
    const maxRetries = 2

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await transcribeVideo(url)
        const transcript = result.text || ""

        console.log(`[v0] Transcription complete on attempt ${attempt + 1}: ${transcript.length} characters`)

        return NextResponse.json({
          transcript: transcript,
          duration: result.duration,
          language: result.language,
        })
      } catch (error) {
        lastError = error as Error
        console.error(`[v0] Transcription attempt ${attempt + 1} failed:`, error)

        // Don't retry on certain errors
        if (error instanceof Error && error.message.includes("too large")) {
          break
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }

    // All retries failed
    throw lastError || new Error("Transcription failed")
  } catch (error) {
    console.error("[v0] Transcription error:", error)
    return NextResponse.json(
      {
        transcript: "",
        error: "Transcription failed but file is still usable",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }, // Return 200 so the file remains usable
    )
  }
}
