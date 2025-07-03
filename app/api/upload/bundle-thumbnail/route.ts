import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

// Configure Cloudflare R2
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const bundleId = formData.get("bundleId") as string

    if (!file || !bundleId) {
      return NextResponse.json({ error: "File and bundle ID are required" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }, { status: 400 })
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
    }

    // Verify bundle ownership
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    if (bundleData?.creatorId !== decodedToken.uid) {
      return NextResponse.json({ error: "Unauthorized to modify this bundle" }, { status: 403 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop()
    const fileName = `bundle-thumbnails/${bundleId}/${timestamp}.${fileExtension}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      ContentLength: file.size,
    })

    await r2Client.send(uploadCommand)

    // Generate public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`

    // Update bundle with new thumbnail
    await db.collection("bundles").doc(bundleId).update({
      coverImage: publicUrl,
      customPreviewThumbnail: publicUrl,
      updatedAt: new Date(),
    })

    console.log(`✅ [Bundle Thumbnail] Uploaded for bundle ${bundleId}: ${publicUrl}`)

    return NextResponse.json({
      success: true,
      url: publicUrl,
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
