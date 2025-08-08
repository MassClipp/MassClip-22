import { type NextRequest, NextResponse } from "next/server"
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { headers } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    console.log("🏁 [Chunked Upload] Finalize endpoint called")

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
    const { uploadId } = body

    console.log("🔄 [Chunked Upload] Finalizing upload:", uploadId)

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

    console.log("📥 [Chunked Upload] Downloading and combining chunks...")

    // Download all chunks and combine them
    const chunks: Buffer[] = []
    for (let i = 0; i < sessionData.chunkCount; i++) {
      const chunkKey = `chunks/${uploadId}/chunk_${i}`
      
      try {
        const getCommand = new GetObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
          Key: chunkKey,
        })

        const response = await s3Client.send(getCommand)
        if (response.Body) {
          const chunkBuffer = Buffer.from(await response.Body.transformToByteArray())
          chunks.push(chunkBuffer)
          console.log(`✅ [Chunked Upload] Downloaded chunk ${i}, size: ${chunkBuffer.length} bytes`)
        }
      } catch (error) {
        console.error(`❌ [Chunked Upload] Failed to download chunk ${i}:`, error)
        throw new Error(`Failed to download chunk ${i}`)
      }
    }

    // Combine all chunks into a single buffer
    const combinedBuffer = Buffer.concat(chunks)
    console.log(`🔗 [Chunked Upload] Combined ${chunks.length} chunks, total size: ${combinedBuffer.length} bytes`)

    // Upload the combined file
    const putCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: sessionData.finalKey,
      Body: combinedBuffer,
      ContentType: sessionData.fileType || "application/octet-stream",
    })

    await s3Client.send(putCommand)
    console.log("✅ [Chunked Upload] Combined file uploaded to:", sessionData.finalKey)

    // Clean up chunk files
    console.log("🧹 [Chunked Upload] Cleaning up chunk files...")
    for (let i = 0; i < sessionData.chunkCount; i++) {
      const chunkKey = `chunks/${uploadId}/chunk_${i}`
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
          Key: chunkKey,
        })
        await s3Client.send(deleteCommand)
      } catch (error) {
        console.warn(`⚠️ [Chunked Upload] Failed to delete chunk ${i}:`, error)
      }
    }

    // Generate the final file URL
    const fileUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${sessionData.finalKey}`

    // Create upload record in Firestore
    const uploadRecord = {
      id: uploadId,
      uid: userId,
      username: sessionData.username,
      title: sessionData.fileName.replace(/\.[^/.]+$/, ""), // Remove file extension
      fileUrl,
      thumbnailUrl: "", // Will be generated later
      fileType: sessionData.fileType,
      size: sessionData.fileSize,
      duration: 0, // Will be updated later
      views: 0,
      downloads: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "completed",
      uploadMethod: "chunked",
    }

    // Add to uploads collection
    await db.collection("uploads").doc(uploadId).set(uploadRecord)

    // Also add to free_content collection for creator profile
    await db.collection("free_content").doc(uploadId).set({
      ...uploadRecord,
      isPremium: false,
      type: "video",
    })

    // Update upload session status
    await db.collection("upload_sessions").doc(uploadId).update({
      status: "completed",
      completedAt: new Date(),
      finalUrl: fileUrl,
    })

    console.log("✅ [Chunked Upload] Upload finalized successfully:", uploadId)

    return NextResponse.json({
      success: true,
      uploadId,
      fileUrl,
      message: "Upload completed successfully",
    })
  } catch (error) {
    console.error("❌ [Chunked Upload] Finalize error:", error)
    
    // Update session status to failed
    try {
      const body = await request.json()
      const { uploadId } = body
      if (uploadId) {
        await db.collection("upload_sessions").doc(uploadId).update({
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          failedAt: new Date(),
        })
      }
    } catch (updateError) {
      console.error("❌ [Chunked Upload] Failed to update session status:", updateError)
    }

    return NextResponse.json(
      {
        error: "Failed to finalize upload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
