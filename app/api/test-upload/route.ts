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

export async function GET(request: NextRequest) {
  console.log("Test upload endpoint called")

  try {
    // Generate a test file key
    const fileId = uuidv4()
    const key = `test-uploads/test-user/${fileId}-test-file.mp4`

    console.log("Generated test file key:", key)

    // Create a presigned URL for uploading
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      ContentType: "video/mp4",
    })

    console.log("Generating presigned URL...")
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    console.log("Generated presigned URL")

    return NextResponse.json({
      success: true,
      message: "Test successful",
      presignedUrl,
      key,
      bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
    })
  } catch (error) {
    console.error("Test upload error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Test failed",
        details: error instanceof Error ? error.message : String(error),
        env: {
          hasEndpoint: !!process.env.CLOUDFLARE_R2_ENDPOINT,
          hasAccessKey: !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
          hasBucketName: !!process.env.CLOUDFLARE_R2_BUCKET_NAME,
          hasPublicUrl: !!process.env.CLOUDFLARE_R2_PUBLIC_URL,
        },
      },
      { status: 500 },
    )
  }
}
