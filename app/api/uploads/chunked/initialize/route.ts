import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { headers } from "next/headers"

// Initialize Firebase Admin
initializeFirebaseAdmin()

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

    const { uploadId, fileName, fileSize, fileType, totalChunks, chunkSize } = await request.json()

    if (!uploadId || !fileName || !fileSize || !fileType || !totalChunks) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user's username for folder organization
    let username = null
    try {
      const userDocRef = db.collection("users").doc(user.uid)
      const userDoc = await userDocRef.get()

      if (userDoc && userDoc.exists) {
        const userData = userDoc.data() || {}
        username = userData.username
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
    }

    // Create file path
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileKey = username 
      ? `creators/${username}/${timestamp}-${sanitizedFileName}`
      : `users/${user.uid}/${timestamp}-${sanitizedFileName}`

    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL}/${fileKey}`

    // Store upload session in database
    const uploadSession = {
      uploadId,
      uid: user.uid,
      fileName,
      fileSize,
      fileType,
      totalChunks,
      chunkSize,
      r2Key: fileKey,
      publicUrl,
      completedChunks: [],
      status: 'initialized',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection("uploadSessions").doc(uploadId).set(uploadSession)

    return NextResponse.json({
      success: true,
      uploadId,
      publicUrl,
      r2Key: fileKey,
      totalChunks
    })

  } catch (error) {
    console.error("Error initializing chunked upload:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
