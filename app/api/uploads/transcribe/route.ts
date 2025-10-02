import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"
import { transcribeVideo } from "@/lib/groq-transcription"

initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    console.log("🎙️ [Transcribe] Starting transcription request...")

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const { uploadId } = await request.json()

    if (!uploadId) {
      return NextResponse.json({ error: "Upload ID required" }, { status: 400 })
    }

    console.log(`🎙️ [Transcribe] Fetching upload: ${uploadId}`)

    // Get upload document
    const uploadDoc = await db.collection("uploads").doc(uploadId).get()

    if (!uploadDoc.exists) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    const uploadData = uploadDoc.data()

    // Verify ownership
    if (uploadData?.uid !== userId && uploadData?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if it's a video
    const mimeType = uploadData?.mimeType || uploadData?.type || ""
    if (!mimeType.startsWith("video/")) {
      return NextResponse.json({ error: "Only videos can be transcribed" }, { status: 400 })
    }

    // Check if already transcribed
    if (uploadData?.transcript) {
      console.log("✅ [Transcribe] Already transcribed, returning existing transcript")
      return NextResponse.json({
        success: true,
        transcript: uploadData.transcript,
        alreadyTranscribed: true,
      })
    }

    const videoUrl = uploadData?.url || uploadData?.downloadURL
    if (!videoUrl) {
      return NextResponse.json({ error: "Video URL not found" }, { status: 400 })
    }

    console.log(`🎙️ [Transcribe] Transcribing video...`)

    // Transcribe with Groq
    const result = await transcribeVideo(videoUrl)

    console.log(`✅ [Transcribe] Transcription complete: ${result.text.length} characters`)

    // Update Firestore with transcript
    await db.collection("uploads").doc(uploadId).update({
      transcript: result.text,
      transcriptDuration: result.duration,
      transcriptLanguage: result.language,
      transcribedAt: new Date(),
    })

    console.log(`✅ [Transcribe] Transcript saved to Firestore`)

    return NextResponse.json({
      success: true,
      transcript: result.text,
      duration: result.duration,
      language: result.language,
    })
  } catch (error) {
    console.error("❌ [Transcribe] Error:", error)
    return NextResponse.json(
      {
        error: "Transcription failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
