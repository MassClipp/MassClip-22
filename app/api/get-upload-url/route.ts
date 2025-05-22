import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { v4 as uuidv4 } from "uuid"

// Initialize R2 client
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

export async function POST(request: NextRequest) {
  try {
    // Get session cookie
    const sessionCookie = cookies().get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "No session cookie found" }, { status: 401 })
    }

    // Verify the session cookie
    initializeFirebaseAdmin()
    const auth = getAuth()
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true)
    const userId = decodedClaims.uid

    if (!userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Parse request body
    const { fileName, fileType, contentType } = await request.json()

    if (!fileName || !fileType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate a unique file name to prevent overwrites
    const uniqueFileName = `${userId}/${uuidv4()}-${fileName}`

    // Set the bucket name from environment variable
    const bucketName = process.env.R2_BUCKET_NAME

    if (!bucketName) {
      return NextResponse.json({ error: "R2 bucket not configured" }, { status: 500 })
    }

    // Create the command to put an object in the bucket
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      ContentType: fileType,
    })

    // Generate a pre-signed URL for uploading
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // URL expires in 1 hour

    // Generate the public URL that will be accessible after upload
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${uniqueFileName}`

    return NextResponse.json({
      success: true,
      uploadUrl: signedUrl,
      publicUrl: publicUrl,
      key: uniqueFileName,
    })
  } catch (error) {
    console.error("Error generating upload URL:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
