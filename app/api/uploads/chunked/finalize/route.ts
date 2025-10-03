import { type NextRequest, NextResponse } from "next/server"
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { headers } from "next/headers"
import { transcribeVideo } from "@/lib/groq-transcription"

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

async function combineChunksInR2(bucketName: string, r2Key: string, totalChunks: number) {
  console.log(`🔄 [Combine Chunks] Starting combination for ${totalChunks} chunks`)

  try {
    // Get all chunk objects
    const chunkBuffers: Buffer[] = []

    for (let i = 0; i < totalChunks; i++) {
      const chunkKey = `${r2Key}.chunk.${i}`
      console.log(`📥 [Combine Chunks] Downloading chunk ${i}: ${chunkKey}`)

      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: chunkKey,
      })

      const response = await s3Client.send(getCommand)
      if (!response.Body) {
        throw new Error(`Chunk ${i} has no body`)
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = []
      const reader = response.Body.transformToWebStream().getReader()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }

      const chunkBuffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
      chunkBuffers.push(chunkBuffer)
      console.log(`✅ [Combine Chunks] Downloaded chunk ${i} (${chunkBuffer.length} bytes)`)
    }

    // Combine all chunks into one buffer
    const combinedBuffer = Buffer.concat(chunkBuffers)
    console.log(`🔗 [Combine Chunks] Combined ${chunkBuffers.length} chunks into ${combinedBuffer.length} bytes`)

    // Upload combined file
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
      Body: combinedBuffer,
      ContentType: "video/mp4", // Default to mp4, should be determined from original file type
    })

    await s3Client.send(putCommand)
    console.log(`✅ [Combine Chunks] Uploaded combined file: ${r2Key}`)

    // Clean up chunk files
    for (let i = 0; i < totalChunks; i++) {
      const chunkKey = `${r2Key}.chunk.${i}`
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: chunkKey,
        })
        await s3Client.send(deleteCommand)
        console.log(`🗑️ [Combine Chunks] Deleted chunk: ${chunkKey}`)
      } catch (error) {
        console.warn(`⚠️ [Combine Chunks] Failed to delete chunk ${chunkKey}:`, error)
      }
    }

    return true
  } catch (error) {
    console.error("❌ [Combine Chunks] Error combining chunks:", error)
    throw error
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
      return NextResponse.json(
        {
          error: `Missing chunks. Expected ${sessionData.totalChunks}, got ${completedChunks.length}`,
        },
        { status: 400 },
      )
    }

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME
    if (!bucketName) {
      return NextResponse.json({ error: "R2 bucket not configured" }, { status: 500 })
    }

    console.log(`🏁 [Finalize] Starting finalization for ${uploadId}`)

    try {
      // Combine chunks into final file
      await combineChunksInR2(bucketName, sessionData.r2Key, sessionData.totalChunks)

      // Create upload record in database
      const uploadData = {
        uid: user.uid,
        fileUrl: sessionData.publicUrl,
        filename: sessionData.originalFileName,
        title: sessionData.originalFileName.split(".")[0],
        type: getFileType(sessionData.fileType),
        size: sessionData.fileSize,
        mimeType: sessionData.fileType,
        folderId: sessionData.folderId || null,
        folderPath: sessionData.folderPath || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        uploadMethod: "chunked",
        originalUploadId: uploadId,
        views: 0,
        downloads: 0,
      }

      const uploadRef = await db.collection("uploads").add(uploadData)
      console.log(`✅ [Finalize] Created upload record: ${uploadRef.id}`)

      if (uploadData.type === "video") {
        console.log(`[v0] VIDEO DETECTED - Type: ${uploadData.type}`)
        console.log(`[v0] Starting transcription for upload: ${uploadRef.id}`)
        console.log(`[v0] Video URL: ${sessionData.publicUrl}`)

        // Fire-and-forget transcription (don't block the response)
        transcribeVideo(sessionData.publicUrl)
          .then(async (result) => {
            console.log(`[v0] TRANSCRIPTION SUCCESS - Length: ${result.text.length} chars`)
            console.log(`[v0] Transcript preview: ${result.text.substring(0, 100)}...`)

            // Save transcript to database
            await db.collection("uploads").doc(uploadRef.id).update({
              transcript: result.text,
              transcriptDuration: result.duration,
              transcriptLanguage: result.language,
              transcribedAt: new Date(),
            })

            console.log(`[v0] Transcript saved to database for upload: ${uploadRef.id}`)
          })
          .catch((err) => {
            console.error(`[v0] TRANSCRIPTION FAILED for upload ${uploadRef.id}:`, err)
            console.error(`[v0] Error details:`, JSON.stringify(err, null, 2))
          })
      } else {
        console.log(`[v0] NOT A VIDEO - Type: ${uploadData.type}, skipping transcription`)
      }

      // Update session status
      await db.collection("uploadSessions").doc(uploadId).update({
        status: "completed",
        finalUploadId: uploadRef.id,
        completedAt: new Date(),
        updatedAt: new Date(),
      })

      console.log(`✅ [Finalize] Upload completed: ${uploadRef.id}`)

      return NextResponse.json({
        success: true,
        uploadId: uploadRef.id,
        fileUrl: sessionData.publicUrl,
        message: "Upload completed successfully",
      })
    } catch (combineError) {
      console.error("❌ [Finalize] Failed to combine chunks:", combineError)

      await db
        .collection("uploadSessions")
        .doc(uploadId)
        .update({
          status: "error",
          error: combineError instanceof Error ? combineError.message : "Failed to combine chunks",
          updatedAt: new Date(),
        })

      return NextResponse.json({ error: "Failed to combine uploaded chunks into final file" }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ [Finalize] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
