import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

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
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get request body
    const { videoUrl, fileId, contentType, userId } = await request.json()

    // Validate request
    if (!videoUrl || !fileId || !contentType || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify Firebase token
    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)

    // Verify the user is updating their own content
    if (decodedToken.uid !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const username = userData?.username

    if (!username) {
      return NextResponse.json({ error: "Username not found" }, { status: 404 })
    }

    // For this example, we'll use a simple approach to generate a thumbnail
    // In a production environment, you might want to use a service like FFmpeg
    // or a third-party API to generate a proper thumbnail at a specific timestamp

    // Generate thumbnail key
    const thumbnailKey = `creators/${username}/${contentType}/thumbnails/${fileId}.jpg`

    // Create a pre-signed URL for uploading the thumbnail
    const putCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: thumbnailKey,
      ContentType: "image/jpeg",
    })

    const presignedUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 })
    const thumbnailUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${thumbnailKey}`

    // Update the video document with the thumbnail URL
    const collectionPath = `users/${userId}/${contentType}Clips`
    await db.collection(collectionPath).doc(fileId).update({
      thumbnailUrl,
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      thumbnailUrl,
      presignedUrl,
    })
  } catch (error) {
    console.error("Error generating thumbnail:", error)
    return NextResponse.json({ error: "Failed to generate thumbnail" }, { status: 500 })
  }
}
