import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { headers } from "next/headers"

// Initialize Firebase Admin
initializeFirebaseAdmin()

// Initialize R2 client
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

async function verifyAuthToken(request: NextRequest) {
  try {
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization?.startsWith("Bearer ")) {
      return null
    }

    const token = authorization.split("Bearer ")[1]
    if (!token) {
      return null
    }

    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("Token verification failed:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { uploadId, chunkIndex, chunkSize } = await request.json()

    if (!uploadId || chunkIndex === undefined || !chunkSize) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get upload session
    const sessionDoc = await db.collection("uploadSessions").doc(uploadId).get()
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Upload session not found" }, { status: 404 })
    }

    const sessionData = sessionDoc.data()!
    if (sessionData.uid !== user.uid) {
      return NextResponse.json({ error: "Unauthorized access to upload session" }, { status: 403 })
    }

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME
    if (!bucketName) {
      return NextResponse.json({ error: "R2 bucket not configured" }, { status: 500 })
    }

    // Generate chunk key
    const chunkKey = `${sessionData.r2Key}.chunk.${chunkIndex}`

    // Create presigned URL for chunk upload
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: chunkKey,
      ContentType: "application/octet-stream"
    })

    const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 }) // 1 hour

    console.log(`🔗 [Chunk URL] Generated for chunk ${chunkIndex}: ${chunkKey}`)

    return NextResponse.json({
      success: true,
      uploadUrl,
      chunkKey
    })

  } catch (error) {
    console.error("Error generating chunk upload URL:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
