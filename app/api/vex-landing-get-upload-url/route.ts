import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

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
    console.log("🔍 [Landing R2 Upload] POST request received")

    const { fileName, fileType } = await request.json()
    console.log("🔍 [Landing R2 Upload] Request data:", { fileName, fileType })

    if (!fileName || !fileType) {
      console.error("❌ [Landing R2 Upload] Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileKey = `landing/${timestamp}-${sanitizedFileName}`

    console.log("🔍 [Landing R2 Upload] Generated file key:", fileKey)

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME
    console.log("🔍 [Landing R2 Upload] Using bucket:", bucketName)

    if (!bucketName) {
      console.error("❌ [Landing R2 Upload] R2 bucket not configured")
      return NextResponse.json({ error: "R2 bucket not configured" }, { status: 500 })
    }

    const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      console.error("❌ [Landing R2 Upload] Missing R2 credentials")
      return NextResponse.json({ error: "R2 credentials not configured" }, { status: 500 })
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: fileType,
    })

    console.log("🔍 [Landing R2 Upload] Generating presigned URL...")
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    console.log("✅ [Landing R2 Upload] Presigned URL generated successfully")

    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL}/${fileKey}`
    console.log("🔍 [Landing R2 Upload] Public URL:", publicUrl)

    return NextResponse.json({
      success: true,
      uploadUrl: signedUrl,
      publicUrl: publicUrl,
      key: fileKey,
    })
  } catch (error) {
    console.error("❌ [Landing R2 Upload] Error generating upload URL:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
