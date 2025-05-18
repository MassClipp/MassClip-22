import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { FieldValue } from "firebase-admin/firestore"
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
    console.log("Upload request received")

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Unauthorized - missing or invalid auth header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const isPremiumStr = formData.get("isPremium") as string
    const isPremium = isPremiumStr === "true"

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Verify Firebase token
    try {
      const token = authHeader.split("Bearer ")[1]
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
      const contentType = isPremium ? "premium" : "free"

      // Generate a presigned URL for the client to upload to
      const key = `creators/${username}/${contentType}/${fileId}.mp4`

      const command = new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
        ContentType: "video/mp4",
        Metadata: {
          username,
          userId: uid,
          contentType,
          title,
        },
      })

      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
      console.log("Generated presigned URL successfully")

      // Create the video metadata record in Firestore
      const videoData = {
        title,
        description: description || "",
        key,
        fileId,
        contentType,
        duration: 0,
        thumbnailUrl: "",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        userId: uid,
        status: "pending", // Will be updated to "active" after upload
        views: 0,
        likes: 0,
        publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
      }

      // Save to the appropriate collection based on content type
      const collectionPath = `users/${uid}/${contentType}Clips`
      console.log(`Saving to collection: ${collectionPath}`)
      await db.collection(collectionPath).doc(fileId).set(videoData)

      return NextResponse.json({
        success: true,
        presignedUrl,
        fileId,
        key,
        publicUrl: videoData.publicUrl,
      })
    } catch (authError) {
      console.error("Authentication error:", authError)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }
  } catch (error) {
    console.error("Error processing upload:", error)
    return NextResponse.json(
      {
        error: "Failed to process upload",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
