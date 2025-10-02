import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export interface TranscriptionResult {
  text: string
  duration?: number
  language?: string
}

// Main transcription function
export async function transcribeVideo(videoUrl: string): Promise<TranscriptionResult> {
  console.log("[v0] 🎬 transcribeVideo CALLED with URL:", videoUrl)
  console.log("[v0] 🔑 GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY)
  console.log("🎤 [Groq Transcription] Starting transcription for:", videoUrl)

  try {
    console.log("[v0] 📡 Fetching video from URL...")
    // Download video from URL
    const response = await fetch(videoUrl)
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`)
    }

    console.log("[v0] ✅ Video fetched successfully, converting to buffer...")
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`✅ [Groq Transcription] Downloaded ${buffer.length} bytes`)

    // Create File object for Groq
    const filename = videoUrl.split("/").pop() || "video.mp4"
    const audioFilename = filename.replace(/\.(mp4|mov|avi|mkv|webm)$/i, ".mp3")
    const file = new File([buffer], audioFilename, { type: "audio/mpeg" })

    console.log("[v0] 🚀 Calling Groq API with file:", audioFilename)
    console.log("🚀 [Groq Transcription] Calling Groq Whisper API...")

    // Call Groq's Whisper model
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3-turbo",
      language: "en",
      response_format: "verbose_json",
      temperature: 0.0,
    })

    console.log("[v0] 🎉 Groq API returned successfully!")
    console.log(`✅ [Groq Transcription] Completed`)
    console.log(`📝 [Groq Transcription] Text length: ${transcription.text?.length || 0} characters`)

    return {
      text: transcription.text || "",
      duration: transcription.duration,
      language: transcription.language || "en",
    }
  } catch (error) {
    console.error("[v0] ❌ TRANSCRIPTION ERROR:", error)
    console.error("[v0] ❌ Error type:", error instanceof Error ? error.constructor.name : typeof error)
    console.error("[v0] ❌ Error message:", error instanceof Error ? error.message : String(error))
    console.error("❌ [Groq Transcription] Error:", error)
    throw error
  }
}

// Alias for backward compatibility
export async function transcribeVideoWithGroq(videoUrl: string): Promise<TranscriptionResult> {
  console.log("[v0] 🔄 transcribeVideoWithGroq called, forwarding to transcribeVideo")
  return transcribeVideo(videoUrl)
}
