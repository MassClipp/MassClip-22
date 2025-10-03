import Groq from "groq-sdk"
import { Buffer } from "buffer"
import { File } from "formdata-node"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export interface TranscriptionResult {
  text: string
  duration?: number
  language?: string
}

export async function transcribeVideo(videoUrl: string): Promise<TranscriptionResult> {
  console.log("🎤 [Transcription] Starting transcription for:", videoUrl)

  try {
    // Download video
    const response = await fetch(videoUrl)
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`✅ [Transcription] Downloaded ${buffer.length} bytes`)

    // Create audio file for Groq
    const filename = videoUrl.split("/").pop() || "video.mp4"
    const audioFilename = filename.replace(/\.(mp4|mov|avi|mkv|webm)$/i, ".mp3")
    const file = new File([buffer], audioFilename, { type: "audio/mpeg" })

    console.log("🚀 [Transcription] Calling Groq Whisper API...")

    // Call Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3-turbo",
      language: "en",
      response_format: "verbose_json",
      temperature: 0.0,
    })

    console.log(`✅ [Transcription] Completed (${transcription.text?.length || 0} characters)`)

    return {
      text: transcription.text || "",
      duration: transcription.duration,
      language: transcription.language || "en",
    }
  } catch (error) {
    console.error("❌ [Transcription] Error:", error)
    throw error
  }
}

export const transcribeVideoWithGroq = transcribeVideo
