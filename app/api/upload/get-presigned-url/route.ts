import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
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
    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const auth = getAuth()

    // Get the session cookie
    const sessionCookie = request.cookies.get("session")?.value
    console.log("Session cookie present:", !!sessionCookie)

    if (!sessionCookie) {
      // For testing purposes, let's try to get the user from the request body
      const body = await request.json()
      console.log("Request body:", body)

      // Check if we're in test mode and have a test user
      if (process.env.PREVIEW_MODE_TRUE === "true" && body.testMode) {
        console.log("Using test mode with user:", body.testUserId)
        const testUserId = body.testUserId || "test-user"
        const testUsername = body.testUsername || "test-user"

        // Generate a unique file ID
        const fileId = uuidv4()
        const isPremium = body.isPremium || false
        const contentType = isPremium ? "premium" : "free"
        const fileName = body.fileName || "test-file.mp4"

        // Create the key (path) for the file in R2
        const key = `creators/${testUsername}/${contentType}/${fileId}-${fileName}`

        // Create a presigned URL for uploading
        const command = new PutObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: key,
          ContentType: body.fileType || "video/mp4",
        })

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

        return NextResponse.json({
          success: true,
          presignedUrl,
          fileId,
          key,
          publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
          testMode: true,
        })
      }

      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the session cookie
    try {
      console.log("Verifying session cookie...")
      const decodedClaims = await auth.verifySessionCookie(sessionCookie)
      const uid = decodedClaims.uid
      console.log("Session verified for user:", uid)

      // Get user data from Firestore
      const userDoc = await db.collection("users").doc(uid).get()

      if (!userDoc.exists) {
        console.log("User not found in Firestore")
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const userData = userDoc.data()
      const username = userData?.username || uid

      console.log("Username:", username)

      // Parse the request body
      const body = await request.json()
      const { fileName, fileType, isPremium = false } = body

      if (!fileName) {
        return NextResponse.json({ error: "File name is required" }, { status: 400 })
      }

      // Generate a unique file ID
      const fileId = uuidv4()
      const contentType = isPremium ? "premium" : "free"

      // Create the key (path) for the file in R2
      const key = `creators/${username}/${contentType}/${fileId}-${fileName}`

      console.log("File will be stored at:", key)

      // Create a presigned URL for uploading
      const command = new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
        ContentType: fileType,
      })

      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

      return NextResponse.json({
        success: true,
        presignedUrl,
        fileId,
        key,
        publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
      })
    } catch (error) {
      console.error("Session verification failed:", error)
      return NextResponse.json(
        {
          error: "Invalid session",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("Error generating presigned URL:", error)
    return NextResponse.json(
      {
        error: "Failed to generate presigned URL",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
}
