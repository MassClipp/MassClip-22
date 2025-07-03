import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { v4 as uuidv4 } from "uuid"

// Configure Cloudflare R2
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL!

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Bundle Thumbnail] Upload request received")

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      console.error("❌ [Bundle Thumbnail] Authentication failed")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`✅ [Bundle Thumbnail] User authenticated: ${userId}`)

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File
    const bundleId = formData.get("bundleId") as string

    if (!file) {
      console.error("❌ [Bundle Thumbnail] No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!bundleId) {
      console.error("❌ [Bundle Thumbnail] No bundle ID provided")
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    console.log(`📦 [Bundle Thumbnail] Processing file:`, {
      name: file.name,
      size: file.size,
      type: file.type,
      bundleId,
    })

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      console.error(`❌ [Bundle Thumbnail] Invalid file type: ${file.type}`)
      return NextResponse.json(
        { error: "Invalid file type. Please upload JPEG, PNG, or WebP images only." },
        { status: 400 },
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      console.error(`❌ [Bundle Thumbnail] File too large: ${file.size} bytes`)
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
    }

    // Verify bundle exists and user owns it
    let bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      // Try productBoxes collection as fallback
      bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
    }

    if (!bundleDoc.exists) {
      console.error(`❌ [Bundle Thumbnail] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    if (bundleData?.creatorId !== userId) {
      console.error(`❌ [Bundle Thumbnail] User ${userId} does not own bundle ${bundleId}`)
      return NextResponse.json({ error: "You don't have permission to modify this bundle" }, { status: 403 })
    }

    console.log(`✅ [Bundle Thumbnail] Bundle ownership verified`)

    // Generate unique filename
    const fileExtension = file.name.split(".").pop() || "jpg"
    const fileName = `bundle-thumbnails/${bundleId}/${uuidv4()}.${fileExtension}`

    console.log(`📤 [Bundle Thumbnail] Uploading to R2: ${fileName}`)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Cloudflare R2
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      ContentLength: buffer.length,
      Metadata: {
        bundleId,
        uploadedBy: userId,
        originalName: file.name,
      },
    })

    await r2Client.send(uploadCommand)

    // Construct public URL
    const publicUrl = `${PUBLIC_URL}/${fileName}`
    console.log(`✅ [Bundle Thumbnail] Upload successful: ${publicUrl}`)

    // Update bundle with thumbnail URL
    await bundleDoc.ref.update({
      coverImage: publicUrl,
      updatedAt: new Date(),
    })

    console.log(`✅ [Bundle Thumbnail] Bundle updated with thumbnail URL`)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      message: "Thumbnail uploaded successfully",
    })
  } catch (error) {
    console.error("❌ [Bundle Thumbnail] Upload error:", error)
    return NextResponse.json(
      {
        error: "Failed to upload thumbnail",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
