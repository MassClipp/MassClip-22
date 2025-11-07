import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { transcribeVideo } from "@/lib/groq-transcription"

initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  console.log("🤖 [Auto-Transcribe] Request received")

  try {
    const { uploadId, videoUrl, mimeType, fileUrl, contentType } = await request.json()

    // Support both parameter formats
    const finalUploadId = uploadId
    const finalVideoUrl = videoUrl || fileUrl
    const finalMimeType = mimeType || contentType

    console.log(`📦 [Auto-Transcribe] Data:`, {
      uploadId: finalUploadId,
      videoUrl: finalVideoUrl,
      mimeType: finalMimeType,
    })

    if (!finalUploadId || !finalVideoUrl) {
      return NextResponse.json({ error: "Upload ID and video URL required" }, { status: 400 })
    }

    if (!finalMimeType?.startsWith("video/") && !finalMimeType?.startsWith("audio/")) {
      console.log("⏭️ [Auto-Transcribe] Skipping non-video/audio file")
      return NextResponse.json({ success: true, skipped: true })
    }

    console.log(`🎤 [Auto-Transcribe] Starting transcription for ${finalUploadId}`)

    await db.collection("uploads").doc(finalUploadId).update({
      transcriptionStatus: "processing",
      transcriptionStartedAt: new Date(),
    })

    try {
      const result = await transcribeVideo(finalVideoUrl)

      await db.collection("uploads").doc(finalUploadId).update({
        transcript: result.text,
        transcriptDuration: result.duration,
        transcriptLanguage: result.language,
        transcriptionStatus: "completed",
        transcribedAt: new Date(),
      })

      console.log(`✅ [Auto-Transcribe] Saved transcript (${result.text.length} chars)`)

      return NextResponse.json({
        success: true,
        transcript: result.text,
        duration: result.duration,
        language: result.language,
      })
    } catch (transcribeError) {
      console.error(`❌ [Auto-Transcribe] Failed for ${finalUploadId}:`, transcribeError)

      await db
        .collection("uploads")
        .doc(finalUploadId)
        .update({
          transcriptionStatus: "failed",
          transcriptionError: transcribeError instanceof Error ? transcribeError.message : "Unknown error",
        })

      return NextResponse.json(
        {
          success: false,
          error: transcribeError instanceof Error ? transcribeError.message : "Transcription failed",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Auto-Transcribe] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Transcription failed",
      },
      { status: 500 },
    )
  }
}
