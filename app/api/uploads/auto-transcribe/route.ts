import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"
import { transcribeVideo } from "@/lib/groq-transcription"

initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  console.log("🤖 [Auto-Transcribe] Request received")

  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Auto-Transcribe] No auth token")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    console.log(`✅ [Auto-Transcribe] Authenticated user: ${decodedToken.uid}`)

    // Get request data
    const { uploadId, videoUrl, mimeType } = await request.json()
    console.log(`📦 [Auto-Transcribe] Data:`, { uploadId, videoUrl, mimeType })

    if (!uploadId || !videoUrl) {
      return NextResponse.json({ error: "Upload ID and video URL required" }, { status: 400 })
    }

    // Only transcribe videos
    if (!mimeType?.startsWith("video/")) {
      console.log("⏭️ [Auto-Transcribe] Skipping non-video")
      return NextResponse.json({ success: true, skipped: true })
    }

    console.log(`🎤 [Auto-Transcribe] Starting transcription for ${uploadId}`)

    // Transcribe
    const result = await transcribeVideo(videoUrl)

    // Save to Firestore
    await db.collection("uploads").doc(uploadId).update({
      transcript: result.text,
      transcriptDuration: result.duration,
      transcriptLanguage: result.language,
      transcribedAt: new Date(),
    })

    console.log(`✅ [Auto-Transcribe] Saved transcript (${result.text.length} chars)`)

    return NextResponse.json({
      success: true,
      transcript: result.text,
      duration: result.duration,
      language: result.language,
    })
  } catch (error) {
    console.error("❌ [Auto-Transcribe] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Transcription failed",
      },
      { status: 200 }, // Return 200 so upload doesn't fail
    )
  }
}
