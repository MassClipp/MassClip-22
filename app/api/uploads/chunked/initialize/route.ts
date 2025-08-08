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

    if (!uploadId || !fileName || !fileSize || !fileType || !totalChunks || !chunkSize) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user profile to determine upload path
    const userDoc = await db.collection("users").doc(user.uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const userData = userDoc.data()!
    const username = userData.username

    if (!username) {
      return NextResponse.json({ error: "Username not found in profile" }, { status: 400 })
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const uniqueFileName = `${timestamp}-${fileName}`
    const r2Key = `creators/${username}/${uniqueFileName}`
    
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL}/${r2Key}`

    // Create upload session in Firestore
    const sessionData = {
      uploadId,
      uid: user.uid,
      fileName,
      originalFileName: fileName,
      fileSize,
      fileType,
      totalChunks,
      chunkSize,
      r2Key,
      publicUrl,
      username,
      status: 'initializing',
      completedChunks: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection("uploadSessions").doc(uploadId).set(sessionData)

    console.log(`✅ [Chunked Upload] Initialized session: ${uploadId}`)
    console.log(`📁 [Chunked Upload] R2 Key: ${r2Key}`)
    console.log(`🌐 [Chunked Upload] Public URL: ${publicUrl}`)

    return NextResponse.json({
      success: true,
      uploadId,
      publicUrl,
      r2Key,
      totalChunks,
      chunkSize
    })

  } catch (error) {
    console.error("Error initializing chunked upload:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
