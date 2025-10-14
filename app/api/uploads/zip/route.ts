import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import JSZip from "jszip"
import { getContentTypeFromFilename, getFileCategoryFromMimeType } from "@/lib/mime-types"

// Initialize Firebase Admin
initializeFirebaseAdmin()

// Initialize R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  },
})

const bucketName = process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME || ""
const publicDomain = process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL || ""

async function verifyAuthToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.split("Bearer ")[1]
    if (!token) return null

    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("❌ [Auth] Token verification failed:", error)
    return null
  }
}

function generatePublicURL(key: string): string {
  if (publicDomain) {
    return `${publicDomain}/${key}`
  }
  return `https://pub-${bucketName}.r2.dev/${key}`
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Zip Upload] POST request received")

    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const zipFile = formData.get("zipFile") as File
    const folderId = formData.get("folderId") as string | null

    if (!zipFile) {
      return NextResponse.json({ error: "No zip file provided" }, { status: 400 })
    }

    if (!zipFile.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "File must be a ZIP archive" }, { status: 400 })
    }

    console.log(`📁 [Zip Upload] Processing zip file: ${zipFile.name}`)

    // Get user's username for folder organization
    let username = null
    try {
      const userDocRef = db.collection("users").doc(user.uid)
      const userDoc = await userDocRef.get()
      if (userDoc && userDoc.exists) {
        const userData = userDoc.data() || {}
        username = userData.username
      }
    } catch (error) {
      console.error("❌ [Zip Upload] Error fetching user profile:", error)
    }

    // Read and extract zip file
    const zipBuffer = await zipFile.arrayBuffer()
    const zip = new JSZip()
    const zipContents = await zip.loadAsync(zipBuffer)

    const uploadResults: any[] = []
    const errors: string[] = []

    // Process each file in the zip
    for (const [relativePath, zipEntry] of Object.entries(zipContents.files)) {
      // Skip directories and hidden files
      if (zipEntry.dir || relativePath.startsWith("__MACOSX/") || relativePath.startsWith(".")) {
        continue
      }

      try {
        console.log(`📄 [Zip Upload] Processing file: ${relativePath}`)

        // Get file content as buffer
        const fileBuffer = await zipEntry.async("uint8array")
        const filename = relativePath.split("/").pop() || relativePath
        const mimeType = getContentTypeFromFilename(filename)
        const category = getFileCategoryFromMimeType(mimeType)

        // Generate unique key for R2
        const timestamp = Date.now()
        const sanitizedFileName = filename.replace(/[^a-zA-Z0-9.-]/g, "_")

        let fileKey: string
        if (username) {
          const basePath = `creators/${username}`
          fileKey = `${basePath}/${timestamp}-${sanitizedFileName}`
        } else {
          const basePath = `users/${user.uid}`
          fileKey = `${basePath}/${timestamp}-${sanitizedFileName}`
        }

        // Upload to R2
        const uploadCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
          Body: fileBuffer,
          ContentType: mimeType,
          ContentLength: fileBuffer.length,
        })

        await r2Client.send(uploadCommand)
        console.log(`✅ [R2] File uploaded: ${fileKey}`)

        // Generate public URL
        const fileUrl = generatePublicURL(fileKey)

        // Create upload metadata
        const metadata = {
          uid: user.uid,
          title: filename.split(".")[0],
          filename,
          fileUrl,
          fileSize: fileBuffer.length,
          mimeType,
          contentType: category,
          type: category,
          category,
          publicUrl: fileUrl,
          downloadUrl: fileUrl,
          r2Key: fileKey,
          thumbnailUrl: null,
          ...(folderId && folderId !== "main" ? { folderId } : {}),
          createdAt: new Date(),
          updatedAt: new Date(),
          extractedFrom: zipFile.name,
          originalPath: relativePath,
        }

        // Save to Firestore
        const docRef = await db.collection("uploads").add(metadata)
        console.log(`✅ [Firestore] Upload record created: ${docRef.id}`)

        uploadResults.push({
          id: docRef.id,
          filename,
          fileUrl,
          size: fileBuffer.length,
          type: category,
        })
      } catch (fileError) {
        console.error(`❌ [Zip Upload] Error processing ${relativePath}:`, fileError)
        errors.push(
          `Failed to process ${relativePath}: ${fileError instanceof Error ? fileError.message : "Unknown error"}`,
        )
      }
    }

    console.log(`✅ [Zip Upload] Processed ${uploadResults.length} files successfully`)
    if (errors.length > 0) {
      console.warn(`⚠️ [Zip Upload] ${errors.length} files failed to process`)
    }

    return NextResponse.json({
      success: true,
      uploadedFiles: uploadResults,
      totalFiles: uploadResults.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("❌ [Zip Upload] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to process zip file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
