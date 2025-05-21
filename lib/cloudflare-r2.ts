import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Initialize the S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  },
})

export async function generatePresignedUrl(fileName: string, contentType: string) {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || ""
  const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    ContentType: contentType,
  })

  try {
    // Generate a presigned URL that expires in 5 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })

    return {
      uploadUrl,
      publicUrl,
      expiresAt: new Date(Date.now() + 300 * 1000).toISOString(),
    }
  } catch (error) {
    console.error("Error generating presigned URL:", error)
    throw error
  }
}
