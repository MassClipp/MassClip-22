import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { transcribeVideo } from "@/lib/groq-transcription"

initializeFirebaseAdmin()

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileKey = `landing-uploads/${timestamp}-${sanitizedFileName}`

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME

    if (!bucketName) {
      return NextResponse.json({ error: "R2 bucket not configured" }, { status: 500 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: buffer,
      ContentType: file.type,
    })

    await s3Client.send(uploadCommand)
    console.log(`✅ [Landing Upload] Uploaded to R2: ${fileKey}`)

    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL}/${fileKey}`

    let contentType = "other"
    if (file.type.startsWith("video/")) contentType = "video"
    else if (file.type.startsWith("audio/")) contentType = "audio"

    const metadata = {
      filename: file.name,
      fileUrl: publicUrl,
      fileSize: file.size,
      mimeType: file.type,
      contentType,
      r2Key: fileKey,
      type: contentType,
      publicUrl,
      createdAt: new Date(),
    }

    const docRef = await db.collection("landingUploads").add(metadata)
    console.log(`✅ [Landing Upload] Metadata saved to Firestore: ${docRef.id}`)

    let transcript = null
    if (contentType === "video" || contentType === "audio") {
      try {
        console.log(`🎤 [Landing Upload] Starting transcription for ${docRef.id}...`)
        const result = await transcribeVideo(publicUrl)
        transcript = result.text

        await docRef.update({
          transcript: result.text,
          transcriptDuration: result.duration,
          transcriptLanguage: result.language,
          transcribedAt: new Date(),
        })

        console.log(`✅ [Landing Upload] Transcription complete: ${transcript.length} characters`)
      } catch (error) {
        console.error("❌ [Landing Upload] Transcription failed:", error)
        // Don't fail the upload if transcription fails
      }
    }

    return NextResponse.json({
      success: true,
      id: docRef.id,
      name: file.name,
      size: file.size,
      type: file.type,
      publicUrl,
      transcript,
    })
  } catch (error) {
    console.error("❌ [Landing Upload] Error:", error)
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
