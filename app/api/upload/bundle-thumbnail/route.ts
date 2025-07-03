import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { db } from "@/lib/firebase-admin"
import { verifyIdToken } from "@/lib/auth-utils"

const s3Client = new S3Client({
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
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const decodedToken = await verifyIdToken(token)
    if (!decodedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const bundleId = formData.get("bundleId") as string

    if (!file || !bundleId) {
      return NextResponse.json({ error: "File and bundle ID are required" }, { status: 400 })
    }

    // Verify bundle ownership
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    if (bundleData?.userId !== decodedToken.uid) {
      return NextResponse.json({ error: "Unauthorized to modify this bundle" }, { status: 403 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
        },
        { status: 400 },
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: "File too large. Maximum size is 5MB.",
        },
        { status: 400 },
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop()
    const fileName = `bundle-thumbnails/${bundleId}/${timestamp}.${fileExtension}`

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        bundleId: bundleId,
        uploadedBy: decodedToken.uid,
        originalName: file.name,
      },
    })

    await s3Client.send(uploadCommand)

    // Generate public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`

    // Update bundle with new thumbnail URL
    await db.collection("bundles").doc(bundleId).update({
      coverImage: publicUrl,
      customPreviewThumbnail: publicUrl,
      updatedAt: new Date(),
    })

    console.log(`✅ [Bundle Thumbnail] Uploaded thumbnail for bundle ${bundleId}: ${publicUrl}`)

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
