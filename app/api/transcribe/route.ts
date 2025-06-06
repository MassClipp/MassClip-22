import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Initialize OpenAI client with timeout
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 2 minute timeout
})

export async function POST(request: NextRequest) {
  console.log("🎤 [Transcribe API] Starting transcription request")
  const startTime = Date.now()

  try {
    // Check for OpenAI API key first
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ [Transcribe API] Missing OpenAI API key")
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key not configured",
          details: "OPENAI_API_KEY environment variable is not set",
        },
        { status: 500 },
      )
    }

    console.log("✅ [Transcribe API] OpenAI API key found")

    // Check content length before parsing
    const contentLength = request.headers.get("content-length")
    if (contentLength) {
      const size = Number.parseInt(contentLength)
      const maxSize = 25 * 1024 * 1024 // 25MB
      if (size > maxSize) {
        console.error("❌ [Transcribe API] Request too large:", size)
        return NextResponse.json(
          {
            success: false,
            error: `File too large: ${(size / 1024 / 1024).toFixed(1)}MB (max 25MB)`,
          },
          { status: 413 },
        )
      }
    }

    let formData: FormData
    try {
      console.log("📦 [Transcribe API] Parsing form data...")
      formData = await request.formData()
      console.log("✅ [Transcribe API] Form data parsed successfully")
    } catch (parseError) {
      console.error("❌ [Transcribe API] Failed to parse form data:", parseError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse upload data",
          details: parseError instanceof Error ? parseError.message : "Unknown parsing error",
        },
        { status: 400 },
      )
    }

    const videoFile = formData.get("video") as File
    const title = formData.get("title") as string

    if (!videoFile) {
      console.error("❌ [Transcribe API] No video file provided")
      return NextResponse.json(
        {
          success: false,
          error: "No video file provided",
        },
        { status: 400 },
      )
    }

    console.log("📹 [Transcribe API] Processing video:", {
      name: videoFile.name,
      size: videoFile.size,
      type: videoFile.type,
      title: title || "No title",
    })

    // Validate file size
    const maxSize = 25 * 1024 * 1024 // 25MB
    if (videoFile.size > maxSize) {
      console.error("❌ [Transcribe API] File too large:", videoFile.size)
      return NextResponse.json(
        {
          success: false,
          error: `File size (${(videoFile.size / 1024 / 1024).toFixed(1)}MB) exceeds 25MB limit`,
        },
        { status: 413 },
      )
    }

    // Validate file type
    if (!videoFile.type.startsWith("video/") && !videoFile.type.startsWith("audio/")) {
      console.error("❌ [Transcribe API] Invalid file type:", videoFile.type)
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type: ${videoFile.type}`,
        },
        { status: 400 },
      )
    }

    // Convert File to Buffer for OpenAI
    let arrayBuffer: ArrayBuffer
    try {
      console.log("🔄 [Transcribe API] Converting file to buffer...")
      arrayBuffer = await videoFile.arrayBuffer()
      console.log("✅ [Transcribe API] File buffer created successfully:", {
        bufferSize: arrayBuffer.byteLength,
      })
    } catch (bufferError) {
      console.error("❌ [Transcribe API] Failed to read file buffer:", bufferError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to read file data",
          details: bufferError instanceof Error ? bufferError.message : "Unknown buffer error",
        },
        { status: 500 },
      )
    }

    const buffer = Buffer.from(arrayBuffer)

    console.log("🤖 [Transcribe API] Preparing OpenAI Whisper request...")

    try {
      // Create a proper File object for OpenAI
      const audioFileName = videoFile.name.replace(/\.(mp4|mov|avi|mkv|webm)$/i, ".mp3")
      const file = new File([buffer], audioFileName, {
        type: videoFile.type.startsWith("video/") ? "audio/mpeg" : videoFile.type,
      })

      console.log("🎵 [Transcribe API] Prepared file for Whisper:", {
        name: file.name,
        type: file.type,
        size: file.size,
      })

      console.log("🚀 [Transcribe API] Calling OpenAI Whisper API...")
      const whisperStartTime = Date.now()

      // Test OpenAI connection first
      try {
        console.log("🔍 [Transcribe API] Testing OpenAI connection...")

        // Create the transcription request
        const transcription = await openai.audio.transcriptions.create({
          file: file,
          model: "whisper-1",
          language: "en",
          response_format: "verbose_json",
          temperature: 0.0,
          prompt: title ? `This is a video titled: ${title}` : undefined,
        })

        const whisperTime = Date.now() - whisperStartTime
        console.log("✅ [Transcribe API] Whisper API completed in:", `${whisperTime}ms`)

        console.log("📝 [Transcribe API] Transcription details:", {
          textLength: transcription.text?.length || 0,
          duration: transcription.duration || 0,
          language: transcription.language || "unknown",
          segmentsCount: transcription.segments?.length || 0,
        })

        // Validate transcription result
        if (!transcription.text || transcription.text.trim().length === 0) {
          console.warn("⚠️ [Transcribe API] Empty transcription result")
          return NextResponse.json(
            {
              success: false,
              error: "No speech detected in the video",
              details: "The video may not contain clear audio or speech",
            },
            { status: 400 },
          )
        }

        // Prepare response
        const result = {
          text: transcription.text.trim(),
          duration: transcription.duration || 0,
          language: transcription.language || "en",
          ...(transcription.segments && { segments: transcription.segments }),
        }

        const totalTime = Date.now() - startTime
        console.log("🎉 [Transcribe API] Transcription completed successfully in:", `${totalTime}ms`)

        return NextResponse.json(
          {
            success: true,
            transcription: result,
            metadata: {
              model: "whisper-1",
              originalFilename: videoFile.name,
              processedFilename: audioFileName,
              fileSize: videoFile.size,
              processingTime: totalTime,
              whisperTime: whisperTime,
              segmentsCount: transcription.segments?.length || 0,
            },
          },
          { status: 200 },
        )
      } catch (openaiError: any) {
        const errorTime = Date.now() - startTime
        console.error("❌ [Transcribe API] OpenAI error after:", `${errorTime}ms`)
        console.error("❌ [Transcribe API] Full OpenAI error:", {
          message: openaiError.message,
          type: openaiError.type,
          code: openaiError.code,
          status: openaiError.status,
          error: openaiError.error,
          stack: openaiError.stack,
        })

        // Handle specific OpenAI errors
        let errorMessage = "OpenAI Whisper API failed"
        let statusCode = 500

        if (openaiError.message?.includes("timeout")) {
          errorMessage = "OpenAI API timeout (request took too long)"
          statusCode = 408
        } else if (openaiError.message?.includes("file size") || openaiError.message?.includes("too large")) {
          errorMessage = "File too large for OpenAI Whisper (max 25MB)"
          statusCode = 413
        } else if (openaiError.message?.includes("format") || openaiError.message?.includes("unsupported")) {
          errorMessage = "Unsupported file format for OpenAI Whisper"
          statusCode = 400
        } else if (openaiError.message?.includes("quota") || openaiError.message?.includes("rate limit")) {
          errorMessage = "OpenAI API quota exceeded or rate limited"
          statusCode = 429
        } else if (
          openaiError.message?.includes("authentication") ||
          openaiError.message?.includes("api key") ||
          openaiError.message?.includes("Incorrect API key")
        ) {
          errorMessage = "OpenAI API authentication failed - check API key"
          statusCode = 401
        } else if (openaiError.message?.includes("billing") || openaiError.message?.includes("payment")) {
          errorMessage = "OpenAI API billing issue - check account status"
          statusCode = 402
        } else if (openaiError.status === 500) {
          errorMessage = "OpenAI API server error - try again later"
          statusCode = 502
        }

        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            details: openaiError.message || "Unknown OpenAI error",
            errorType: openaiError.type || "unknown",
            processingTime: errorTime,
            openaiStatus: openaiError.status,
          },
          { status: statusCode },
        )
      }
    } catch (fileError) {
      console.error("❌ [Transcribe API] File processing error:", fileError)
      return NextResponse.json(
        {
          success: false,
          error: "File processing failed",
          details: fileError instanceof Error ? fileError.message : "Unknown file error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    const errorTime = Date.now() - startTime
    console.error("❌ [Transcribe API] Unexpected error after:", `${errorTime}ms`)
    console.error("❌ [Transcribe API] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
      type: typeof error,
    })

    return NextResponse.json(
      {
        success: false,
        error: "Transcription service failed",
        details: error instanceof Error ? error.message : "Unknown server error",
        processingTime: errorTime,
      },
      { status: 500 },
    )
  }
}

// Set runtime to handle file uploads
export const runtime = "nodejs"
