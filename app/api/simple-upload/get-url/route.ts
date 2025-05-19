import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { v4 as uuidv4 } from "uuid"

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  },
})

export async function POST(request: NextRequest) {
  console.log("Get presigned URL endpoint called")

  try {
    // Parse request body
    const body = await request.json()
    const { fileName, contentType } = body

    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 })
    }

    // Generate a unique file ID and key
    const fileId = uuidv4()
    const key = `test-uploads/simple-test/${fileId}-${fileName}`

    console.log("Generated file key:", key)
    console.log("Content type:", contentType)

    // Create a presigned URL for uploading
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType || "application/octet-stream",
    })

    console.log("Generating presigned URL...")
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    console.log("Generated presigned URL")

    return NextResponse.json({
      success: true,
      presignedUrl,
      key,
    })
  } catch (error) {
    console.error("Error generating presigned URL:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate presigned URL",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
