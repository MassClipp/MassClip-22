import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { auth } from "@/lib/firebase-admin"
import { v4 as uuidv4 } from "uuid"

// Configure S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  },
})

export async function POST(request: NextRequest) {
  console.log("Presigned URL request received")

  try {
    // Verify authentication
    const sessionCookie = request.cookies.get("session")?.value

    if (!sessionCookie) {
      console.log("No session cookie found")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    let decodedToken
    try {
      decodedToken = await auth.verifySessionCookie(sessionCookie)
    } catch (error) {
      console.error("Session verification failed:", error)
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const uid = decodedToken.uid
    const userData = await auth.getUser(uid)
    const username = userData.displayName || uid

    console.log(`Authenticated user: ${username} (${uid})`)

    // Parse request body
    const { fileName, fileType, isPremium = false } = await request.json()

    if (!fileName) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 })
    }

    // Generate a unique file ID
    const fileId = uuidv4()

    // Determine the storage path based on premium status
    const folderPath = isPremium ? "premium" : "free"
    const key = `creators/${username}/${folderPath}/${fileId}-${fileName}`

    console.log(`Generating presigned URL for: ${key}`)

    // Check if all required environment variables are set
    if (!process.env.CLOUDFLARE_R2_BUCKET_NAME) {
      console.error("Missing R2 bucket name environment variable")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Create the command to put an object in the bucket
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    })

    // Generate a presigned URL
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    console.log("Presigned URL generated successfully")

    return NextResponse.json({
      presignedUrl,
      fileId,
      key,
    })
  } catch (error) {
    console.error("Error generating presigned URL:", error)
    return NextResponse.json(
      { error: `Failed to generate presigned URL: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}

export const maxDuration = 60 // Set max duration to 60 seconds
