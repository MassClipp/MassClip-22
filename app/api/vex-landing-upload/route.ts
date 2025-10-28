import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { transcribeVideo } from "@/lib/groq-transcription"

initializeFirebaseAdmin()

function generatePublicURL(filename: string, r2Key?: string): string {
  const publicDomain = process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL

  if (publicDomain) {
    const key = r2Key || filename
    return `${publicDomain}/${key}`
  }

  const bucketName = process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME
  if (bucketName) {
    return `https://pub-${bucketName}.r2.dev/${filename}`
  }

  return `https://pub-f0fde4a9c6fb4bc7a1f5f9677ef9a304.r2.dev/${filename}`
}

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("❌ [Landing Upload] JSON parse error:", parseError)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { fileUrl, filename, title, size, mimeType, r2Key, sessionId } = body
    console.log("🔍 [Landing Upload] Upload data:", {
      fileUrl,
      filename,
      title,
      size,
      mimeType,
      r2Key,
      sessionId,
    })

    if (!filename) {
      return NextResponse.json({ error: "Missing required field: filename" }, { status: 400 })
    }

    const publicURL = fileUrl || generatePublicURL(filename, r2Key)

    let contentType = "other"
    if (mimeType) {
      if (mimeType.startsWith("video/")) contentType = "video"
      else if (mimeType.startsWith("audio/")) contentType = "audio"
      else if (mimeType.startsWith("image/")) contentType = "image"
      else if (mimeType.includes("pdf") || mimeType.includes("document")) contentType = "document"
    }

    const metadata = {
      sessionId: sessionId || "unknown",

      // Core file information
      title: title || filename.split(".")[0],
      filename,
      fileUrl: publicURL,
      fileSize: size || 0,
      mimeType: mimeType || "application/octet-stream",
      contentType,

      // Optional fields
      r2Key: r2Key || filename,

      // Legacy compatibility
      type: contentType,
      category: contentType,
      publicUrl: publicURL,
      downloadUrl: publicURL,

      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    console.log("📝 [Landing Upload] Creating upload with metadata:", metadata)

    try {
      const docRef = await db.collection("landingUploads").add(metadata)
      console.log(`✅ [Landing Upload] Upload record created with ID: ${docRef.id}`)

      if (contentType === "video" || contentType === "audio") {
        console.log(`🎤 [Landing Upload] Triggering transcription for ${contentType}: ${docRef.id}`)

        transcribeVideo(publicURL)
          .then(async (result) => {
            console.log(`✅ [Landing Auto-Transcribe] Completed for ${docRef.id}`)
            await docRef.update({
              transcript: result.text,
              transcriptDuration: result.duration,
              transcriptLanguage: result.language,
              transcribedAt: new Date(),
            })
            console.log(`💾 [Landing Auto-Transcribe] Saved transcript to Firestore`)
          })
          .catch((error) => {
            console.error(`❌ [Landing Auto-Transcribe] Failed for ${docRef.id}:`, error)
          })
      }

      return NextResponse.json({
        id: docRef.id,
        ...metadata,
      })
    } catch (firestoreError) {
      console.error("❌ [Landing Upload] Firestore error:", firestoreError)
      return NextResponse.json(
        {
          error: "Database error",
          details: firestoreError instanceof Error ? firestoreError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Landing Upload] Error creating upload:", error)
    return NextResponse.json(
      {
        error: "Failed to create upload record",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
