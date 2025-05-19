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
  console.log("Simple upload API route called")

  try {
    // Check if R2 environment variables are set
    if (
      !process.env.CLOUDFLARE_R2_ENDPOINT ||
      !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
      !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
      !process.env.CLOUDFLARE_R2_BUCKET_NAME
    ) {
      console.error("Missing R2 environment variables")
      return NextResponse.json(
        {
          error: "Server configuration error: Missing R2 credentials",
        },
        { status: 500 },
      )
    }

    // Initialize Firebase Admin
    try {
      initializeFirebaseAdmin()
      console.log("Firebase Admin initialized")
    } catch (firebaseInitError) {
      console.error("Firebase Admin initialization error:", firebaseInitError)
      return NextResponse.json(
        {
          error: "Server configuration error: Firebase initialization failed",
        },
        { status: 500 },
      )
    }

    // Parse the multipart form data
    let formData
    try {
      formData = await request.formData()
      console.log("Form data parsed successfully")
    } catch (formDataError) {
      console.error("Error parsing form data:", formDataError)
      return NextResponse.json(
        {
          error: "Invalid form data",
        },
        { status: 400 },
      )
    }

    // Extract form fields
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const isPremiumStr = formData.get("isPremium") as string
    const isPremium = isPremiumStr === "true"
    const file = formData.get("file") as File

    console.log("Form fields extracted:", {
      title,
      hasDescription: !!description,
      isPremium,
      hasFile: !!file,
      fileType: file?.type,
      fileSize: file?.size,
    })

    // Validate required fields
    if (!title) {
      console.log("Title is missing")
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!file) {
      console.log("File is missing")
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    // Get the session cookie for authentication
    const cookies = request.cookies
    const sessionCookie = cookies.get("session")?.value

    if (!sessionCookie) {
      console.log("No session cookie found")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the session cookie
    try {
      console.log("Verifying session cookie")
      const decodedClaims = await getAuth().verifySessionCookie(sessionCookie)
      const uid = decodedClaims.uid
      console.log("User authenticated:", uid)

      // Get user data from Firestore
      console.log("Fetching user data from Firestore")
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
      console.log("Generated file path:", key)

      // Convert the file to an ArrayBuffer
      console.log("Converting file to buffer")
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      console.log("File converted to buffer, size:", buffer.length)

      // Upload the file to R2
      try {
        console.log("Preparing to upload file to R2")
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
      } catch (r2Error) {
        console.error("R2 upload error:", r2Error)
        return NextResponse.json(
          {
            error: "Failed to upload file to storage",
            details: r2Error instanceof Error ? r2Error.message : String(r2Error),
          },
          { status: 500 },
        )
      }

      // Create the video metadata record in Firestore
      try {
        console.log("Preparing video metadata for Firestore")
        const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`
        console.log("Public URL:", publicUrl)

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
          publicUrl,
        }

        // Save to the appropriate collection based on content type
        const collectionPath = `users/${uid}/${contentType}Clips`
        console.log(`Saving to collection: ${collectionPath}`)
        await db.collection(collectionPath).doc(fileId).set(videoData)
        console.log("Video metadata saved to Firestore")
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError)
        return NextResponse.json(
          {
            error: "Failed to save video metadata",
            details: firestoreError instanceof Error ? firestoreError.message : String(firestoreError),
          },
          { status: 500 },
        )
      }

      console.log("Upload process completed successfully")
      return NextResponse.json({
        success: true,
        fileId,
        key,
        publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
      })
    } catch (authError) {
      console.error("Authentication error:", authError)
      return NextResponse.json(
        {
          error: "Invalid authentication",
          details: authError instanceof Error ? authError.message : String(authError),
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("Unhandled error in upload process:", error)
    return NextResponse.json(
      {
        error: "Failed to process upload",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Increase the body size limit for file uploads
export const config = {
  api: {
    bodyParser: false,
    responseLimit: "50mb",
  },
}
