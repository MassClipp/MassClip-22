import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
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
    console.log("Simple upload request received")

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Parse the multipart form data
    const formData = await request.formData()

    // Extract form fields
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const isPremiumStr = formData.get("isPremium") as string
    const isPremium = isPremiumStr === "true"
    const file = formData.get("file") as File

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    // Get the session cookie for authentication
    const cookies = request.cookies
    const sessionCookie = cookies.get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the session cookie
    try {
      const decodedClaims = await getAuth().verifySessionCookie(sessionCookie)
      const uid = decodedClaims.uid
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
      const fileExtension = file.name.split(".").pop() || "mp4"

      // Create the key (path) for the file in R2
      const key = `creators/${username}/${contentType}/${fileId}.${fileExtension}`

      // Convert the file to an ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload the file to R2
      const command = new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        Metadata: {
          username,
          userId: uid,
          contentType,
          title,
        },
      })

      console.log("Uploading file to R2...")
      await s3Client.send(command)
      console.log("File uploaded successfully to R2")

      // Create the video metadata record in Firestore
      const videoData = {
        title,
        description: description || "",
        key,
        fileId,
        contentType: file.type,
        duration: 0, // Placeholder
        thumbnailUrl: "", // Placeholder
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        userId: uid,
        status: "active",
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
        fileId,
        key,
        publicUrl: videoData.publicUrl,
      })
    } catch (authError) {
      console.error("Authentication error:", authError)
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
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
