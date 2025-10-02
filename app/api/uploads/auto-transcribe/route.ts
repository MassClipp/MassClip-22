import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"
import { transcribeVideo } from "@/lib/groq-transcription"

initializeFirebaseAdmin()

// This endpoint is called automatically after video upload
export async function POST(request: NextRequest) {
  try {
    console.log("🤖 [Auto-Transcribe] Starting automatic transcription...")

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const { uploadId, videoUrl, mimeType } = await request.json()

    if (!uploadId || !videoUrl) {
      return NextResponse.json({ error: "Upload ID and video URL required" }, { status: 400 })
    }

    // Only transcribe videos
    if (!mimeType?.startsWith("video/")) {
      console.log("⏭️ [Auto-Transcribe] Skipping non-video content")
      return NextResponse.json({ success: true, skipped: true, reason: "Not a video" })
    }

    console.log(`🤖 [Auto-Transcribe] Transcribing video: ${uploadId}`)

    // Transcribe with Groq
    const result = await transcribeVideo(videoUrl)

    console.log(`✅ [Auto-Transcribe] Transcription complete: ${result.text.length} characters`)

    // Update Firestore with transcript
    await db.collection("uploads").doc(uploadId).update({
      transcript: result.text,
      transcriptDuration: result.duration,
      transcriptLanguage: result.language,
      transcribedAt: new Date(),
    })

    console.log(`✅ [Auto-Transcribe] Transcript saved to Firestore`)

    return NextResponse.json({
      success: true,
      transcript: result.text,
      duration: result.duration,
      language: result.language,
    })
  } catch (error) {
    console.error("❌ [Auto-Transcribe] Error:", error)
    // Don't fail the upload if transcription fails
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Transcription failed",
      },
      { status: 200 }, // Return 200 so upload doesn't fail
    )
  }
}
