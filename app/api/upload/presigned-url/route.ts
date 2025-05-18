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
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get request body
    const { filename, contentType, isPremium } = await request.json()

    // Validate request
    if (!filename || !contentType) {
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
    const uid = decodedToken.uid

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
    const safeFilename = encodeURIComponent(filename.replace(/[^a-zA-Z0-9.-]/g, "_"))
    const fileExtension = safeFilename.split(".").pop()
    const uniqueFilename = `${fileId}-${safeFilename}`

    // Determine the path based on whether it's premium or free
    const contentType_mp4 = isPremium ? "premium" : "free"
    const key = `creators/${username}/${contentType_mp4}/${uniqueFilename}`

    // Create the command to put an object in the bucket
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      Metadata: {
        username,
        userId: uid,
        contentType: contentType_mp4,
        originalFilename: filename,
      },
    })

    // Generate a pre-signed URL
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hour

    // Return the pre-signed URL and file details
    return NextResponse.json({
      presignedUrl,
      key,
      fileId,
      contentType: contentType_mp4,
    })
  } catch (error) {
    console.error("Error generating pre-signed URL:", error)
    return NextResponse.json({ error: "Failed to generate pre-signed URL" }, { status: 500 })
  }
}
