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

    const { fileName, fileType, fileSize, folderId, chunkSize = 5 * 1024 * 1024 } = await request.json()

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user's username
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

    // Build folder path if provided
    let folderPath = ""
    if (folderId) {
      try {
        const folderDocRef = db.collection("folders").doc(folderId)
        const folderDoc = await folderDocRef.get()
        if (folderDoc && folderDoc.exists) {
          const folderData = folderDoc.data() || {}
          if (folderData.uid === user.uid) {
            folderPath = folderData.path || ""
          }
        }
      } catch (error) {
        console.error("Error fetching folder:", error)
      }
    }

    // Generate R2 key
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
    let r2Key: string

    if (username) {
      const basePath = `creators/${username}`
      r2Key = folderPath
        ? `${basePath}/${folderPath}/${timestamp}-${sanitizedFileName}`
        : `${basePath}/${timestamp}-${sanitizedFileName}`
    } else {
      const basePath = `users/${user.uid}`
      r2Key = folderPath
        ? `${basePath}/${folderPath}/${timestamp}-${sanitizedFileName}`
        : `${basePath}/${timestamp}-${sanitizedFileName}`
    }

    // Calculate total chunks
    const totalChunks = Math.ceil(fileSize / chunkSize)

    // Generate public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL}/${r2Key}`

    // Create upload session
    const sessionData = {
      uid: user.uid,
      username: username || null,
      originalFileName: fileName,
      fileType,
      fileSize,
      chunkSize,
      totalChunks,
      r2Key,
      publicUrl,
      folderId: folderId || null,
      folderPath: folderPath || null,
      status: "pending",
      completedChunks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const sessionRef = await db.collection("uploadSessions").add(sessionData)

    console.log(`🎬 [Init Upload] Created session ${sessionRef.id} for ${fileName} (${totalChunks} chunks)`)

    return NextResponse.json({
      success: true,
      uploadId: sessionRef.id,
      totalChunks,
      chunkSize,
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
