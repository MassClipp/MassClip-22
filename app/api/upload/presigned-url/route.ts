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
    console.log("Presigned URL request received")

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get request body
    const { filename, contentType, isPremium } = await request.json()
    console.log("Request body:", { filename, contentType, isPremium })

    // Validate request
    if (!filename || !contentType) {
      console.log("Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Unauthorized - missing or invalid auth header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify Firebase token
    const token = authHeader.split("Bearer ")[1]
    try {
      const decodedToken = await getAuth().verifyIdToken(token)
      const uid = decodedToken.uid
      console.log("User authenticated:", uid)

      // Get user data from Firestore
      const userDoc = await db.collection("users").doc(uid).get()
      if (!userDoc.exists) {
        console.log("User not found in Firestore")
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const userData = userDoc.data()
      const username = userData?.username

      if (!username) {
        console.log("Username not found in user data")
        return NextResponse.json({ error: "Username not found" }, { status: 404 })
      }

      // Generate a unique file ID
      const fileId = nanoid(10)
      const safeFilename = encodeURIComponent(filename.replace(/[^a-zA-Z0-9.-]/g, "_"))
      const uniqueFilename = `${fileId}-${safeFilename}`

      // Determine the path based on whether it's premium or free
      const contentType_mp4 = isPremium ? "premium" : "free"
      const key = `creators/${username}/${contentType_mp4}/${uniqueFilename}`
      console.log("Generated file key:", key)

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
      console.log("Generated presigned URL successfully")

      // Return the pre-signed URL and file details
      return NextResponse.json({
        presignedUrl,
        key,
        fileId,
        contentType: contentType_mp4,
      })
    } catch (authError) {
      console.error("Authentication error:", authError)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }
  } catch (error) {
    console.error("Error generating pre-signed URL:", error)
    return NextResponse.json(
      {
        error: "Failed to generate pre-signed URL",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
