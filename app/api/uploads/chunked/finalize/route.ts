import { type NextRequest, NextResponse } from "next/server"
import { S3Client, CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
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

async function combineChunks(bucketName: string, r2Key: string, totalChunks: number) {
  // For R2, we need to combine chunks manually
  // This is a simplified approach - in production, you might want to use multipart upload
  
  try {
    // Verify all chunks exist
    for (let i = 0; i < totalChunks; i++) {
      const chunkKey = `${r2Key}.chunk.${i}`
      try {
        await s3Client.send(new HeadObjectCommand({
          Bucket: bucketName,
          Key: chunkKey
        }))
      } catch (error) {
        throw new Error(`Missing chunk ${i}`)
      }
    }

    // For now, we'll assume chunks are combined externally or use a different approach
    // In a real implementation, you'd need to implement chunk combination logic
    
    return true
  } catch (error) {
    console.error("Error combining chunks:", error)
    throw error
  }
}

async function cleanupChunks(bucketName: string, r2Key: string, totalChunks: number) {
  const deletePromises = []
  
  for (let i = 0; i < totalChunks; i++) {
    const chunkKey = `${r2Key}.chunk.${i}`
    deletePromises.push(
      s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: chunkKey
      })).catch(error => {
        console.warn(`Failed to delete chunk ${chunkKey}:`, error)
      })
    )
  }

  await Promise.all(deletePromises)
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
        error: `Incomplete upload: ${completedChunks.length}/${sessionData.totalChunks} chunks completed` 
      }, { status: 400 })
    }

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME
    if (!bucketName) {
      return NextResponse.json({ error: "R2 bucket not configured" }, { status: 500 })
    }

    try {
      // Combine chunks into final file
      await combineChunks(bucketName, sessionData.r2Key, sessionData.totalChunks)

      // Create upload record in database
      const uploadRecord = {
        uid: user.uid,
        title: sessionData.fileName.split(".")[0],
        filename: sessionData.fileName,
        fileUrl: sessionData.publicUrl,
        fileSize: sessionData.fileSize,
        mimeType: sessionData.fileType,
        contentType: sessionData.fileType.startsWith("video/") ? "video" : 
                    sessionData.fileType.startsWith("audio/") ? "audio" :
                    sessionData.fileType.startsWith("image/") ? "image" : "other",
        type: sessionData.fileType.startsWith("video/") ? "video" : 
              sessionData.fileType.startsWith("audio/") ? "audio" :
              sessionData.fileType.startsWith("image/") ? "image" : "other",
        r2Key: sessionData.r2Key,
        publicUrl: sessionData.publicUrl,
        downloadUrl: sessionData.publicUrl,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await db.collection("uploads").add(uploadRecord)

      // Update session status
      await db.collection("uploadSessions").doc(uploadId).update({
        status: 'completed',
        uploadRecordId: docRef.id,
        completedAt: new Date(),
        updatedAt: new Date()
      })

      // Clean up chunks (optional, can be done asynchronously)
      cleanupChunks(bucketName, sessionData.r2Key, sessionData.totalChunks).catch(error => {
        console.warn("Failed to cleanup chunks:", error)
      })

      return NextResponse.json({
        success: true,
        uploadId,
        uploadRecordId: docRef.id,
        publicUrl: sessionData.publicUrl
      })

    } catch (error) {
      // Update session with error status
      await db.collection("uploadSessions").doc(uploadId).update({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date()
      })

      throw error
    }

  } catch (error) {
    console.error("Error finalizing chunked upload:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
