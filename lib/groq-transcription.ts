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
  console.log("🎤 [Groq Transcription] Starting transcription for:", videoUrl)

  try {
    // Download video from URL
    const response = await fetch(videoUrl)
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`✅ [Groq Transcription] Downloaded ${buffer.length} bytes`)

    // Create File object for Groq
    const filename = videoUrl.split("/").pop() || "video.mp4"
    const audioFilename = filename.replace(/\.(mp4|mov|avi|mkv|webm)$/i, ".mp3")
    const file = new File([buffer], audioFilename, { type: "audio/mpeg" })

    console.log("🚀 [Groq Transcription] Calling Groq Whisper API...")

    // Call Groq's Whisper model
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3-turbo",
      language: "en",
      response_format: "verbose_json",
      temperature: 0.0,
    })

    console.log(`✅ [Groq Transcription] Completed`)
    console.log(`📝 [Groq Transcription] Text length: ${transcription.text?.length || 0} characters`)

    return {
      text: transcription.text || "",
      duration: transcription.duration,
      language: transcription.language || "en",
    }
  } catch (error) {
    console.error("❌ [Groq Transcription] Error:", error)
    throw error
  }
}

// Alias for backward compatibility
export async function transcribeVideoWithGroq(videoUrl: string): Promise<TranscriptionResult> {
  return transcribeVideo(videoUrl)
}
