import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

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
    console.log("[v0] Landing upload: Starting file upload")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("[v0] Landing upload: File received:", file.name, file.type, file.size)

    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileKey = `landing/${timestamp}-${sanitizedFileName}`

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME

    if (!bucketName) {
      return NextResponse.json({ error: "R2 bucket not configured" }, { status: 500 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log("[v0] Landing upload: Uploading to R2...")

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: buffer,
      ContentType: file.type,
    })

    await s3Client.send(command)

    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL}/${fileKey}`

    console.log("[v0] Landing upload: Upload successful, public URL:", publicUrl)

    // Transcribe if video/audio
    let transcript = ""
    if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
      console.log("[v0] Landing upload: Starting transcription...")
      try {
        const transcribeResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/vex-landing-transcribe`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: publicUrl }),
          },
        )

        if (transcribeResponse.ok) {
          const transcribeData = await transcribeResponse.json()
          transcript = transcribeData.transcript || ""
          console.log("[v0] Landing upload: Transcription complete")
        }
      } catch (error) {
        console.error("[v0] Landing upload: Transcription failed:", error)
      }
    }

    return NextResponse.json({
      success: true,
      publicUrl,
      key: fileKey,
      transcript,
      name: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("[v0] Landing upload: Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 })
  }
}
