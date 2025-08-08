import { NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { S3Client } from "@aws-sdk/client-s3"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [Chunked Upload] Initialize endpoint called")

    // Get authorization token
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("❌ [Chunked Upload] No authorization token")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Verify the token and get user
    const admin = await import("firebase-admin")
    const decodedToken = await admin.auth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log("👤 [Chunked Upload] User ID:", userId)

    // Get user profile from the correct collection
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      console.error("❌ [Chunked Upload] User profile not found for:", userId)
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const username = userData?.username

    if (!username) {
      console.error("❌ [Chunked Upload] Username not found for user:", userId)
      return NextResponse.json({ error: "Username not found" }, { status: 400 })
    }

    console.log("📝 [Chunked Upload] Username:", username)

    // Parse request body
    const body = await request.json()
    const { fileName, fileSize, fileType, chunkCount } = body

    console.log("📁 [Chunked Upload] File details:", {
      fileName,
      fileSize,
      fileType,
      chunkCount,
    })

    // Validate required fields
    if (!fileName || !fileSize || !chunkCount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate upload session ID
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2)}`
    const finalKey = `creators/${username}/${uploadId}_${fileName}`

    console.log("🔑 [Chunked Upload] Upload ID:", uploadId)
    console.log("🗂️ [Chunked Upload] Final key:", finalKey)

    // Initialize S3 client for R2
    const s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    })

    // Create upload session in Firestore
    const uploadSession = {
      uploadId,
      userId,
      username,
      fileName,
      fileSize,
      fileType,
      chunkCount,
      finalKey,
      status: "initialized",
      createdAt: new Date(),
      chunksUploaded: 0,
    }

    await db.collection("upload_sessions").doc(uploadId).set(uploadSession)

    console.log("✅ [Chunked Upload] Upload session created:", uploadId)

    return NextResponse.json({
      success: true,
      uploadId,
      finalKey,
      message: "Upload session initialized",
    })
  } catch (error) {
    console.error("❌ [Chunked Upload] Initialize error:", error)
    return NextResponse.json(
      {
        error: "Failed to initialize upload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
