import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server-session"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import crypto from "crypto"

// Initialize the S3 client
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
    // Validate the session and get the current user
    const user = await getCurrentUser()

    if (!user) {
      console.error("No authenticated user found")
      return NextResponse.json({ error: "Unauthorized: No authenticated user found" }, { status: 401 })
    }

    // Parse the request body
    const { fileName, contentType } = await request.json()

    if (!fileName || !contentType) {
      return NextResponse.json({ error: "Missing required fields: fileName and contentType" }, { status: 400 })
    }

    // Generate a unique file key
    const fileExtension = fileName.split(".").pop()
    const randomId = crypto.randomBytes(16).toString("hex")
    const key = `uploads/${user.uid}/${randomId}.${fileExtension}`

    // Create the S3 command
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })

    // Generate a signed URL
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    // Return the signed URL and file key
    return NextResponse.json({
      uploadUrl: signedUrl,
      fileKey: key,
      publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
    })
  } catch (error) {
    console.error("Error generating upload URL:", error)
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 })
  }
}
