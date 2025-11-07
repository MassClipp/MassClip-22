import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"
import { transcribeVideo } from "@/lib/groq-transcription"

initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  console.log("🤖 [Auto-Transcribe] Request received")

  try {
    const authHeader = request.headers.get("authorization")
    console.log(`🔑 [Auto-Transcribe] Auth header present: ${!!authHeader}`)

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Auto-Transcribe] No auth token or invalid format")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid
    console.log(`✅ [Auto-Transcribe] Authenticated user: ${userId}`)

    // Vex will check permissions separately when trying to access them
    // const { checkSubscription } = await import("@/lib/subscription")
    // const subscription = await checkSubscription(userId)

    // if (!subscription.features.canAnalyzeTranscripts) {
    //   console.log("⏭️ [Auto-Transcribe] User does not have transcript analysis permission (Free plan)")
    //   return NextResponse.json({
    //     success: true,
    //     skipped: true,
    //     reason: "Transcript analysis not available on Free plan",
    //   })
    // }

    const { uploadId, videoUrl, mimeType } = await request.json()
    console.log(`📦 [Auto-Transcribe] Data:`, { uploadId, videoUrl, mimeType })

    if (!uploadId || !videoUrl) {
      return NextResponse.json({ error: "Upload ID and video URL required" }, { status: 400 })
    }

    if (!mimeType?.startsWith("video/") && !mimeType?.startsWith("audio/")) {
      console.log("⏭️ [Auto-Transcribe] Skipping non-video/audio file")
      return NextResponse.json({ success: true, skipped: true })
    }

    console.log(`🎤 [Auto-Transcribe] Starting transcription for ${uploadId}`)

    const result = await transcribeVideo(videoUrl)

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
      { status: 200 },
    )
  }
}
