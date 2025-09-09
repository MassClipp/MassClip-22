import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

async function verifyAuthToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Auth] No Bearer token found")
      return null
    }

    const token = authHeader.split("Bearer ")[1]
    if (!token) {
      console.log("❌ [Auth] Empty token")
      return null
    }

    // Import auth here to avoid initialization issues
    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    console.log("✅ [Auth] Token verified for user:", decodedToken.uid)
    return decodedToken
  } catch (error) {
    console.error("❌ [Auth] Token verification failed:", error)
    return null
  }
}

// Helper function to generate public URL
function generatePublicURL(filename: string, r2Key?: string): string {
  const publicDomain = process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL

  if (publicDomain) {
    const key = r2Key || filename
    return `${publicDomain}/${key}`
  }

  // Fallback to a constructed URL
  const bucketName = process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME
  if (bucketName) {
    return `https://pub-${bucketName}.r2.dev/${filename}`
  }

  // Last resort fallback
  return `https://pub-f0fde4a9c6fb4bc7a1f5f9677ef9a304.r2.dev/${filename}`
}

// GET /api/uploads - Fetch user's uploads
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Uploads API] GET request received")

    const user = await verifyAuthToken(request)
    if (!user) {
      console.log("❌ [Uploads API] Unauthorized request")
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Valid authentication token required",
        },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const search = searchParams.get("search")
    const folderId = searchParams.get("folderId")
    const folder = searchParams.get("folder")

    console.log(`🔍 [Uploads API] Fetching uploads for user: ${user.uid}`)
    console.log(`🔍 [Uploads API] Folder filter - folderId: ${folderId}, folder: ${folder}`)

    try {
      // Simple query by UID only to avoid index requirements
      const uploadsRef = db.collection("uploads")
      const query = uploadsRef.where("uid", "==", user.uid)

      const snapshot = await query.get()
      console.log(`🔍 [Uploads API] Found ${snapshot.docs.length} documents`)

      let uploads = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        }
      })

      if (folder === "main") {
        // Show files without folder assignment (folderId is null or undefined)
        uploads = uploads.filter((upload) => !upload.folderId)
      } else if (folderId && folderId !== "root") {
        // Show files in specific folder
        uploads = uploads.filter((upload) => upload.folderId === folderId)
      }
      // If no folder filter or "root", show all files (existing behavior)

      // Apply client-side filtering
      if (type && type !== "all") {
        uploads = uploads.filter((upload) => upload.type === type)
      }

      if (search) {
        const searchLower = search.toLowerCase()
        uploads = uploads.filter(
          (upload) =>
            upload.title?.toLowerCase().includes(searchLower) || upload.filename?.toLowerCase().includes(searchLower),
        )
      }

      // Sort by createdAt (newest first)
      uploads = uploads.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return dateB - dateA
      })

      console.log(`✅ [Uploads API] Returning ${uploads.length} uploads after folder filtering`)
      return NextResponse.json({ uploads })
    } catch (firestoreError) {
      console.error("❌ [Uploads API] Firestore error:", firestoreError)
      return NextResponse.json(
        {
          error: "Database error",
          details: firestoreError instanceof Error ? firestoreError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Uploads API] Error fetching uploads:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch uploads",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// POST /api/uploads - Create new upload record with proper metadata
export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Uploads API] POST request received")

    const user = await verifyAuthToken(request)
    if (!user) {
      console.log("❌ [Uploads API] Unauthorized request")
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Valid authentication token required",
        },
        { status: 401 },
      )
    }

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("❌ [Uploads API] JSON parse error:", parseError)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { fileUrl, filename, title, size, mimeType, r2Key, thumbnailUrl } = body
    console.log("🔍 [Uploads API] Upload data:", { fileUrl, filename, title, size, mimeType, r2Key })

    if (!filename) {
      return NextResponse.json({ error: "Missing required field: filename" }, { status: 400 })
    }

    // Generate proper public URL
    const publicURL = fileUrl || generatePublicURL(filename, r2Key)

    // Auto-detect content type based on MIME type
    let contentType = "other"
    if (mimeType) {
      if (mimeType.startsWith("video/")) contentType = "video"
      else if (mimeType.startsWith("audio/")) contentType = "audio"
      else if (mimeType.startsWith("image/")) contentType = "image"
      else if (mimeType.includes("pdf") || mimeType.includes("document")) contentType = "document"
    }

    // Create comprehensive metadata object
    const metadata = {
      uid: user.uid,

      // Core file information
      title: title || filename.split(".")[0],
      filename,
      fileUrl: publicURL,
      fileSize: size || 0,
      mimeType: mimeType || "application/octet-stream",
      contentType,

      // Optional fields
      thumbnailUrl: thumbnailUrl || null,
      r2Key: r2Key || filename,

      // Legacy compatibility
      type: contentType,
      category: contentType,
      publicUrl: publicURL,
      downloadUrl: publicURL,

      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    console.log("📝 [Uploads API] Creating upload with metadata:", metadata)

    try {
      const docRef = await db.collection("uploads").add(metadata)
      console.log(`✅ [Uploads API] Upload record created with ID: ${docRef.id}`)

      return NextResponse.json({
        id: docRef.id,
        ...metadata,
      })
    } catch (firestoreError) {
      console.error("❌ [Uploads API] Firestore error:", firestoreError)
      return NextResponse.json(
        {
          error: "Database error",
          details: firestoreError instanceof Error ? firestoreError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Uploads API] Error creating upload:", error)
    return NextResponse.json(
      {
        error: "Failed to create upload record",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
