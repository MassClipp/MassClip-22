import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-session"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { db } from "@/lib/firebase-admin"

// Configure Cloudflare R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const ALLOWED_FILE_TYPES = {
  // Documents
  "application/pdf": { category: "document", maxSize: 50 * 1024 * 1024 }, // 50MB
  "application/msword": { category: "document", maxSize: 25 * 1024 * 1024 }, // 25MB
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    category: "document",
    maxSize: 25 * 1024 * 1024,
  },
  "text/plain": { category: "document", maxSize: 10 * 1024 * 1024 }, // 10MB

  // Images
  "image/jpeg": { category: "image", maxSize: 10 * 1024 * 1024 }, // 10MB
  "image/png": { category: "image", maxSize: 10 * 1024 * 1024 },
  "image/gif": { category: "image", maxSize: 10 * 1024 * 1024 },
  "image/webp": { category: "image", maxSize: 10 * 1024 * 1024 },

  // Videos
  "video/mp4": { category: "video", maxSize: 500 * 1024 * 1024 }, // 500MB
  "video/quicktime": { category: "video", maxSize: 500 * 1024 * 1024 },
  "video/x-msvideo": { category: "video", maxSize: 500 * 1024 * 1024 },
  "video/webm": { category: "video", maxSize: 500 * 1024 * 1024 },

  // Audio
  "audio/mpeg": { category: "audio", maxSize: 50 * 1024 * 1024 }, // 50MB
  "audio/wav": { category: "audio", maxSize: 50 * 1024 * 1024 },
  "audio/mp4": { category: "audio", maxSize: 50 * 1024 * 1024 },
  "audio/ogg": { category: "audio", maxSize: 50 * 1024 * 1024 },
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Product Box Upload] Starting file upload process")

    const session = await getServerSession()
    if (!session?.uid) {
      console.log("❌ [Product Box Upload] Unauthorized - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { fileName, fileType, fileSize, productBoxId } = body

    console.log("📝 [Product Box Upload] Upload request:", {
      fileName,
      fileType,
      fileSize,
      productBoxId,
      userId: session.uid,
    })

    // Validate file type
    if (!ALLOWED_FILE_TYPES[fileType as keyof typeof ALLOWED_FILE_TYPES]) {
      console.log(`❌ [Product Box Upload] Unsupported file type: ${fileType}`)
      return NextResponse.json(
        {
          error: "Unsupported file type",
          supportedTypes: Object.keys(ALLOWED_FILE_TYPES),
        },
        { status: 400 },
      )
    }

    const fileConfig = ALLOWED_FILE_TYPES[fileType as keyof typeof ALLOWED_FILE_TYPES]

    // Validate file size
    if (fileSize > fileConfig.maxSize) {
      console.log(`❌ [Product Box Upload] File too large: ${fileSize} > ${fileConfig.maxSize}`)
      return NextResponse.json(
        {
          error: "File too large",
          maxSize: fileConfig.maxSize,
          actualSize: fileSize,
        },
        { status: 400 },
      )
    }

    // Verify product box ownership
    const productBoxRef = db.collection("productBoxes").doc(productBoxId)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      console.log(`❌ [Product Box Upload] Product box not found: ${productBoxId}`)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()
    if (productBoxData?.creatorId !== session.uid) {
      console.log(`❌ [Product Box Upload] Access denied for user ${session.uid} to product box ${productBoxId}`)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Generate unique file path
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileExtension = sanitizedFileName.split(".").pop()
    const uniqueFileName = `${timestamp}_${Math.random().toString(36).substring(2)}.${fileExtension}`
    const filePath = `product-boxes/${productBoxId}/${fileConfig.category}/${uniqueFileName}`

    console.log(`📁 [Product Box Upload] Generated file path: ${filePath}`)

    // Create presigned URL for uploading
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: filePath,
      ContentType: fileType,
      Metadata: {
        originalName: fileName,
        uploadedBy: session.uid,
        productBoxId: productBoxId,
        category: fileConfig.category,
        uploadTimestamp: timestamp.toString(),
      },
    })

    const presignedUrl = await getSignedUrl(r2Client, putObjectCommand, { expiresIn: 3600 }) // 1 hour

    console.log("✅ [Product Box Upload] Generated presigned URL successfully")

    // Create content record in Firestore
    const contentId = `content_${timestamp}_${Math.random().toString(36).substring(2)}`
    const contentData = {
      id: contentId,
      productBoxId,
      creatorId: session.uid,
      fileName: sanitizedFileName,
      originalFileName: fileName,
      fileType,
      fileSize,
      category: fileConfig.category,
      filePath,
      status: "uploading",
      uploadedAt: new Date(),
      publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${filePath}`,
    }

    await db.collection("productBoxContent").doc(contentId).set(contentData)

    console.log(`✅ [Product Box Upload] Created content record: ${contentId}`)

    return NextResponse.json({
      success: true,
      uploadUrl: presignedUrl,
      contentId,
      filePath,
      publicUrl: contentData.publicUrl,
      expiresIn: 3600,
    })
  } catch (error) {
    console.error("❌ [Product Box Upload] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to prepare file upload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Update content status after upload
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { contentId, status } = body

    console.log(`🔄 [Product Box Upload] Updating content status: ${contentId} -> ${status}`)

    const contentRef = db.collection("productBoxContent").doc(contentId)
    const contentDoc = await contentRef.get()

    if (!contentDoc.exists) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    const contentData = contentDoc.data()
    if (contentData?.creatorId !== session.uid) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    await contentRef.update({
      status,
      updatedAt: new Date(),
    })

    console.log(`✅ [Product Box Upload] Updated content status successfully`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ [Product Box Upload] Error updating status:", error)
    return NextResponse.json({ error: "Failed to update content status" }, { status: 500 })
  }
}
