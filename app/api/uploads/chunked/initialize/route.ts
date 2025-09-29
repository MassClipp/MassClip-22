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

    const { uploadId, fileName, fileSize, fileType, totalChunks, chunkSize, folderId, folderPath } =
      await request.json()

    if (!uploadId || !fileName || !fileSize || !fileType || !totalChunks) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user exists in the users collection
    const userDoc = await db.collection("users").doc(user.uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const userData = userDoc.data()!
    const username = userData.username || userData.displayName || "unknown"

    // Generate R2 key for the final file
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")

    let r2Key: string
    if (folderId && folderId !== "main" && folderPath) {
      // Remove leading slash from folder path if present
      const cleanFolderPath = folderPath.startsWith("/") ? folderPath.slice(1) : folderPath
      r2Key = `creators/${username}/${cleanFolderPath}/${timestamp}-${sanitizedFileName}`
    } else {
      // Default path for main folder
      r2Key = `creators/${username}/${timestamp}-${sanitizedFileName}`
    }

    // Generate public URL
    const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME
    const publicUrl = publicDomain ? `${publicDomain}/${r2Key}` : `https://pub-${bucketName}.r2.dev/${r2Key}`

    const sessionData = {
      uploadId,
      uid: user.uid,
      originalFileName: fileName,
      fileSize,
      fileType,
      totalChunks,
      chunkSize,
      r2Key,
      publicUrl,
      folderId: folderId || null,
      folderPath: folderPath || null,
      status: "initialized",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await db.collection("uploadSessions").doc(uploadId).set(sessionData)

    console.log(`✅ [Chunked Upload] Session initialized: ${uploadId}`)
    console.log(`📁 [Chunked Upload] R2 Key: ${r2Key}`)
    console.log(`🔗 [Chunked Upload] Public URL: ${publicUrl}`)
    if (folderId && folderId !== "main") {
      console.log(`📂 [Chunked Upload] Target folder: ${folderId} (${folderPath})`)
    }

    return NextResponse.json({
      success: true,
      uploadId,
      publicUrl,
      r2Key,
    })
  } catch (error) {
    console.error("Error initializing chunked upload:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
