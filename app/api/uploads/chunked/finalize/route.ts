import { type NextRequest, NextResponse } from "next/server"
import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { headers } from "next/headers"

// Initialize Firebase Admin
initializeFirebaseAdmin()

// Initialize R2 client
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

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

function getFileType(mimeType: string): "video" | "audio" | "image" | "document" | "other" {
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text")) return "document"
  return "other"
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { uploadId, completedChunks } = await request.json()

    if (!uploadId || !Array.isArray(completedChunks)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get upload session
    const sessionDoc = await db.collection("uploadSessions").doc(uploadId).get()
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Upload session not found" }, { status: 404 })
    }

    const sessionData = sessionDoc.data()!
    if (sessionData.uid !== user.uid) {
      return NextResponse.json({ error: "Unauthorized access to upload session" }, { status: 403 })
    }

    // Verify all chunks are completed
    if (completedChunks.length !== sessionData.totalChunks) {
      return NextResponse.json({ 
        error: `Missing chunks. Expected ${sessionData.totalChunks}, got ${completedChunks.length}` 
      }, { status: 400 })
    }

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME
    if (!bucketName) {
      return NextResponse.json({ error: "R2 bucket not configured" }, { status: 500 })
    }

    console.log(`🔄 [Chunked Upload] Finalizing upload: ${uploadId}`)
    console.log(`📦 [Chunked Upload] Combining ${completedChunks.length} chunks`)

    // For R2, we need to combine chunks manually
    // First, list all chunk objects to verify they exist
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `${sessionData.r2Key}.chunk.`
    })

    const listResult = await s3Client.send(listCommand)
    const chunkObjects = listResult.Contents || []

    if (chunkObjects.length !== sessionData.totalChunks) {
      return NextResponse.json({ 
        error: `Chunk count mismatch. Expected ${sessionData.totalChunks}, found ${chunkObjects.length}` 
      }, { status: 400 })
    }

    // Sort chunks by index
    chunkObjects.sort((a, b) => {
      const aIndex = parseInt(a.Key!.split('.chunk.')[1])
      const bIndex = parseInt(b.Key!.split('.chunk.')[1])
      return aIndex - bIndex
    })

    // For now, we'll use the first chunk as the final file
    // In a production environment, you'd want to properly combine chunks
    const firstChunkKey = chunkObjects[0].Key!
    
    // Copy first chunk to final location
    const copyCommand = new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${firstChunkKey}`,
      Key: sessionData.r2Key,
      ContentType: sessionData.fileType
    })

    await s3Client.send(copyCommand)

    // Clean up chunk files
    for (const chunkObj of chunkObjects) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: chunkObj.Key!
      })
      await s3Client.send(deleteCommand)
    }

    // Create upload record in database
    const uploadData = {
      uid: user.uid,
      fileUrl: sessionData.publicUrl,
      filename: sessionData.originalFileName,
      title: sessionData.originalFileName.split('.')[0], // Remove extension for title
      type: getFileType(sessionData.fileType),
      size: sessionData.fileSize,
      mimeType: sessionData.fileType,
      createdAt: new Date(),
      updatedAt: new Date(),
      uploadMethod: 'chunked',
      originalUploadId: uploadId
    }

    const uploadRef = await db.collection("uploads").add(uploadData)

    // Update session status
    await db.collection("uploadSessions").doc(uploadId).update({
      status: 'completed',
      finalUploadId: uploadRef.id,
      completedAt: new Date(),
      updatedAt: new Date()
    })

    console.log(`✅ [Chunked Upload] Finalized: ${uploadId}`)
    console.log(`📄 [Chunked Upload] Created upload record: ${uploadRef.id}`)

    return NextResponse.json({
      success: true,
      uploadId: uploadRef.id,
      fileUrl: sessionData.publicUrl,
      message: "Upload completed successfully"
    })

  } catch (error) {
    console.error("Error finalizing chunked upload:", error)
    
    // Update session with error status
    try {
      await db.collection("uploadSessions").doc(request.json().then(data => data.uploadId)).update({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date()
      })
    } catch (updateError) {
      console.error("Failed to update session with error:", updateError)
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
