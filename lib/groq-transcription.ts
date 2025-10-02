import Groq from "groq-sdk"
import { Buffer } from "buffer"
import { File } from "form-data"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export interface TranscriptionResult {
  text: string
  duration?: number
  language?: string
  segments?: Array<{
    start: number
    end: number
    text: string
  }>
}

export async function transcribeVideo(videoUrl: string): Promise<TranscriptionResult> {
  console.log("🎤 [Groq Transcription] Starting transcription for:", videoUrl)

  try {
    // Download video from URL
    console.log("📥 [Groq Transcription] Downloading video...")
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
    const startTime = Date.now()

    // Call Groq's Whisper model
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3-turbo",
      language: "en",
      response_format: "verbose_json",
      temperature: 0.0,
    })

    const duration = Date.now() - startTime
    console.log(`✅ [Groq Transcription] Completed in ${duration}ms`)
    console.log(`📝 [Groq Transcription] Text length: ${transcription.text?.length || 0} characters`)

    return {
      text: transcription.text || "",
      duration: transcription.duration,
      language: transcription.language || "en",
      segments: transcription.segments as any,
    }
  } catch (error) {
    console.error("❌ [Groq Transcription] Error:", error)
    throw error
  }
}

export async function transcribeVideoFile(file: File): Promise<TranscriptionResult> {
  console.log("🎤 [Groq Transcription] Starting transcription for file:", file.name)

  try {
    // Convert to audio filename
    const audioFilename = file.name.replace(/\.(mp4|mov|avi|mkv|webm)$/i, ".mp3")
    const audioFile = new File([file], audioFilename, { type: "audio/mpeg" })

    console.log("🚀 [Groq Transcription] Calling Groq Whisper API...")
    const startTime = Date.now()

    // Call Groq's Whisper model
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      language: "en",
      response_format: "verbose_json",
      temperature: 0.0,
    })

    const duration = Date.now() - startTime
    console.log(`✅ [Groq Transcription] Completed in ${duration}ms`)
    console.log(`📝 [Groq Transcription] Text length: ${transcription.text?.length || 0} characters`)

    return {
      text: transcription.text || "",
      duration: transcription.duration,
      language: transcription.language || "en",
      segments: transcription.segments as any,
    }
  } catch (error) {
    console.error("❌ [Groq Transcription] Error:", error)
    throw error
  }
}

export const transcribeVideoWithGroq = transcribeVideo
