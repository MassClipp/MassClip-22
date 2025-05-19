import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { nanoid } from "nanoid"

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
  try {
    console.log("TEST ENDPOINT: Get upload URL request received")

    // Log all environment variables for debugging
    console.log("Environment variables check:")
    console.log("CLOUDFLARE_R2_ENDPOINT:", process.env.CLOUDFLARE_R2_ENDPOINT ? "✓ Set" : "✗ Not set")
    console.log("CLOUDFLARE_R2_ACCESS_KEY_ID:", process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ? "✓ Set" : "✗ Not set")
    console.log("CLOUDFLARE_R2_SECRET_ACCESS_KEY:", process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ? "✓ Set" : "✗ Not set")
    console.log("CLOUDFLARE_R2_BUCKET_NAME:", process.env.CLOUDFLARE_R2_BUCKET_NAME ? "✓ Set" : "✗ Not set")
    console.log("CLOUDFLARE_R2_PUBLIC_URL:", process.env.CLOUDFLARE_R2_PUBLIC_URL ? "✓ Set" : "✗ Not set")

    // Get form data
    const formData = await request.formData()
    const filename = (formData.get("filename") as string) || "test-file.mp4"
    const contentType = (formData.get("contentType") as string) || "video/mp4"

    // Generate a unique file ID
    const fileId = nanoid(10)

    // Create the key (path) for the file
    const key = `test-uploads/${fileId}-${filename}`

    console.log("Creating presigned URL for:", key)

    // Create the command to generate a presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })

    // Generate the presigned URL
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    console.log("Generated presigned URL successfully")

    return NextResponse.json({
      url,
      key,
      fileId,
      publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
    })
  } catch (error) {
    console.error("Error generating upload URL:", error)
    return NextResponse.json(
      {
        error: "Failed to generate upload URL",
        details: error instanceof Error ? error.message : String(error),
        env: {
          endpoint: process.env.CLOUDFLARE_R2_ENDPOINT ? "Set" : "Not set",
          accessKey: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ? "Set" : "Not set",
          secretKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ? "Set" : "Not set",
          bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME ? "Set" : "Not set",
          publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL ? "Set" : "Not set",
        },
      },
      { status: 500 },
    )
  }
}
