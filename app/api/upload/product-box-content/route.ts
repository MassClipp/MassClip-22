import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

// Initialize Firebase Admin
initializeFirebaseAdmin()

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

function generatePublicURL(key: string): string {
  if (publicDomain) {
    return `${publicDomain}/${key}`
  }
  // Fallback construction
  return `https://pub-${bucketName}.r2.dev/${key}`
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Product Box Content Upload] POST request received")

    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const productBoxId = formData.get("productBoxId") as string
    const title = formData.get("title") as string

    if (!file || !productBoxId) {
      return NextResponse.json({ error: "Missing file or productBoxId" }, { status: 400 })
    }

    console.log(`📁 [Upload] Processing file: ${file.name} for product box: ${productBoxId}`)

    // Generate unique key for R2
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const key = `product-boxes/${productBoxId}/${timestamp}-${sanitizedFileName}`

    try {
      // Upload to R2
      const fileBuffer = await file.arrayBuffer()
      const uploadCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: new Uint8Array(fileBuffer),
        ContentType: file.type,
        ContentLength: file.size,
      })

      await r2Client.send(uploadCommand)
      console.log(`✅ [R2] File uploaded successfully: ${key}`)

      // Generate public URL
      const fileUrl = generatePublicURL(key)
      console.log(`🔗 [URL] Generated public URL: ${fileUrl}`)

      // Create comprehensive metadata
      const metadata = {
        // Core file information
        title: title || file.name.split(".")[0],
        filename: file.name,
        originalFileName: file.name,
        fileUrl: fileUrl, // ✅ CRITICAL: Save the public URL
        fileSize: file.size,
        mimeType: file.type,

        // Storage information
        r2Key: key,
        bucketName: bucketName,

        // Content categorization
        category: file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "document",
        contentType: file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "document",

        // Timestamps
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),

        // Creator info
        creatorId: user.uid,
        productBoxId: productBoxId,

        // Status
        status: "completed",
      }

      console.log("📝 [Metadata] Saving to Firestore:", metadata)

      // Save to product box contents subcollection
      const productBoxRef = db.collection("productBoxes").doc(productBoxId)
      const contentRef = productBoxRef.collection("contents").doc()

      await contentRef.set(metadata)
      console.log(`✅ [Firestore] Content saved to subcollection: ${contentRef.id}`)

      // Also save to productBoxContent collection for compatibility
      const productBoxContentRef = db.collection("productBoxContent").doc(`${productBoxId}_${contentRef.id}`)
      await productBoxContentRef.set({
        ...metadata,
        contentId: contentRef.id,
        publicUrl: fileUrl, // Legacy compatibility
        downloadUrl: fileUrl, // Legacy compatibility
      })

      console.log(`✅ [Firestore] Content saved to main collection: ${productBoxContentRef.id}`)

      return NextResponse.json({
        success: true,
        contentId: contentRef.id,
        fileUrl: fileUrl,
        metadata: metadata,
      })
    } catch (uploadError) {
      console.error("❌ [Upload] Error uploading file:", uploadError)
      return NextResponse.json(
        {
          error: "Upload failed",
          details: uploadError instanceof Error ? uploadError.message : "Unknown upload error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Product Box Content Upload] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to upload content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
