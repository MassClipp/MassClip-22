import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Initialize R2 client
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
    // Parse request body
    const { fileName, fileType } = await request.json()

    if (!fileName || !fileType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Set the bucket name from environment variable
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME

    if (!bucketName) {
      return NextResponse.json({ error: "R2 bucket not configured" }, { status: 500 })
    }

    // Create the command to put an object in the bucket
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: fileType,
    })

    // Generate a pre-signed URL for uploading
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // URL expires in 1 hour

    // Generate the public URL that will be accessible after upload
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL}/${fileName}`

    return NextResponse.json({
      success: true,
      uploadUrl: signedUrl,
      publicUrl: publicUrl,
      key: fileName,
    })
  } catch (error) {
    console.error("Error generating upload URL:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
