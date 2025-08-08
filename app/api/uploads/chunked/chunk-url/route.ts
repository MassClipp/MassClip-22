import { NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 [Chunked Upload] Chunk URL endpoint called")

    // Get authorization token
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Verify the token
    const admin = await import("firebase-admin")
    const decodedToken = await admin.auth().verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse request body
    const body = await request.json()
    const { uploadId, chunkIndex } = body

    console.log("📦 [Chunked Upload] Getting URL for chunk:", chunkIndex, "of upload:", uploadId)

    // Validate required fields
    if (!uploadId || chunkIndex === undefined) {
      return NextResponse.json({ error: "Missing uploadId or chunkIndex" }, { status: 400 })
    }

    // Get upload session
    const sessionDoc = await db.collection("upload_sessions").doc(uploadId).get()
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Upload session not found" }, { status: 404 })
    }

    const sessionData = sessionDoc.data()
    if (sessionData?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized access to upload session" }, { status: 403 })
    }

    // Initialize S3 client for R2
    const s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    })

    // Generate chunk key
    const chunkKey = `chunks/${uploadId}/chunk_${chunkIndex}`

    console.log("🗂️ [Chunked Upload] Chunk key:", chunkKey)

    // Create presigned URL for chunk upload
    const putCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: chunkKey,
      ContentType: sessionData.fileType || "application/octet-stream",
    })

    const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 }) // 1 hour

    console.log("✅ [Chunked Upload] Generated presigned URL for chunk:", chunkIndex)

    return NextResponse.json({
      success: true,
      uploadUrl,
      chunkKey,
    })
  } catch (error) {
    console.error("❌ [Chunked Upload] Chunk URL error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate chunk upload URL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
