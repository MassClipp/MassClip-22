import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
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
  console.log("Get presigned URL API route called")

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Parse the request body
    const body = await request.json()
    const { title, description, isPremium, fileName, fileType, fileSize } = body

    console.log("Request body:", {
      title,
      hasDescription: !!description,
      isPremium,
      fileName,
      fileType,
      fileSize,
    })

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!fileName || !fileType) {
      return NextResponse.json({ error: "File information is required" }, { status: 400 })
    }

    // Get the session cookie for authentication
    const cookies = request.cookies
    const sessionCookie = cookies.get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the session cookie
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie)
    const uid = decodedClaims.uid

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const username = userData?.username

    if (!username) {
      return NextResponse.json({ error: "Username not found" }, { status: 404 })
    }

    // Generate a unique file ID
    const fileId = nanoid(10)
    const contentType = isPremium ? "premium" : "free"
    const fileExtension = fileName.split(".").pop() || "mp4"

    // Create the key (path) for the file in R2
    const key = `creators/${username}/${contentType}/${fileId}.${fileExtension}`

    // Create a presigned URL for uploading
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      Metadata: {
        username,
        userId: uid,
        contentType,
        title,
      },
    })

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hour expiry

    return NextResponse.json({
      success: true,
      presignedUrl,
      fileId,
      key,
      publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
    })
  } catch (error) {
    console.error("Error generating presigned URL:", error)
    return NextResponse.json(
      {
        error: "Failed to generate upload URL",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
