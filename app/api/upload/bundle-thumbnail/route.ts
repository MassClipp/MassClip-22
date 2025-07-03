import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

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
    console.log("🖼️ [Bundle Thumbnail] Starting upload process")

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      console.error("❌ [Bundle Thumbnail] Authentication failed")
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    console.log(`✅ [Bundle Thumbnail] User authenticated: ${userId}`)

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File
    const bundleId = formData.get("bundleId") as string

    if (!file) {
      console.error("❌ [Bundle Thumbnail] No file provided")
      return NextResponse.json(
        {
          error: "No file provided",
          code: "NO_FILE",
        },
        { status: 400 },
      )
    }

    if (!bundleId) {
      console.error("❌ [Bundle Thumbnail] No bundle ID provided")
      return NextResponse.json(
        {
          error: "Bundle ID is required",
          code: "NO_BUNDLE_ID",
        },
        { status: 400 },
      )
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      console.error(`❌ [Bundle Thumbnail] Invalid file type: ${file.type}`)
      return NextResponse.json(
        {
          error: "Invalid file type. Only JPEG, PNG, and WebP are allowed",
          code: "INVALID_FILE_TYPE",
        },
        { status: 400 },
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      console.error(`❌ [Bundle Thumbnail] File too large: ${file.size} bytes`)
      return NextResponse.json(
        {
          error: "File too large. Maximum size is 5MB",
          code: "FILE_TOO_LARGE",
        },
        { status: 400 },
      )
    }

    // Verify bundle ownership
    let bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
    }

    if (!bundleDoc.exists) {
      console.error(`❌ [Bundle Thumbnail] Bundle not found: ${bundleId}`)
      return NextResponse.json(
        {
          error: "Bundle not found",
          code: "BUNDLE_NOT_FOUND",
        },
        { status: 404 },
      )
    }

    const bundleData = bundleDoc.data()
    if (bundleData?.creatorId !== userId) {
      console.error(`❌ [Bundle Thumbnail] User ${userId} not authorized for bundle ${bundleId}`)
      return NextResponse.json(
        {
          error: "Not authorized to modify this bundle",
          code: "NOT_AUTHORIZED",
        },
        { status: 403 },
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop()
    const fileName = `bundle-thumbnails/${bundleId}/${timestamp}.${fileExtension}`

    console.log(`📤 [Bundle Thumbnail] Uploading to R2: ${fileName}`)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Cloudflare R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
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

    await s3Client.send(uploadCommand)

    // Generate public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`

    console.log(`✅ [Bundle Thumbnail] Upload successful: ${publicUrl}`)

    // Update bundle with thumbnail URL
    await bundleDoc.ref.update({
      customPreviewThumbnail: publicUrl,
      thumbnailUpdatedAt: new Date(),
      updatedAt: new Date(),
    })

    console.log(`✅ [Bundle Thumbnail] Bundle updated with thumbnail URL`)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      fileSize: file.size,
      fileType: file.type,
      bundleId,
    })
  } catch (error) {
    console.error("❌ [Bundle Thumbnail] Upload error:", error)
    return NextResponse.json(
      {
        error: "Failed to upload thumbnail",
        code: "UPLOAD_FAILED",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ [Bundle Thumbnail] Starting delete process")

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    const { searchParams } = new URL(request.url)
    const bundleId = searchParams.get("bundleId")

    if (!bundleId) {
      return NextResponse.json(
        {
          error: "Bundle ID is required",
          code: "NO_BUNDLE_ID",
        },
        { status: 400 },
      )
    }

    // Verify bundle ownership
    let bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
    }

    if (!bundleDoc.exists) {
      return NextResponse.json(
        {
          error: "Bundle not found",
          code: "BUNDLE_NOT_FOUND",
        },
        { status: 404 },
      )
    }

    const bundleData = bundleDoc.data()
    if (bundleData?.creatorId !== userId) {
      return NextResponse.json(
        {
          error: "Not authorized to modify this bundle",
          code: "NOT_AUTHORIZED",
        },
        { status: 403 },
      )
    }

    // Remove thumbnail URL from bundle
    await bundleDoc.ref.update({
      customPreviewThumbnail: null,
      thumbnailUpdatedAt: new Date(),
      updatedAt: new Date(),
    })

    console.log(`✅ [Bundle Thumbnail] Thumbnail removed from bundle: ${bundleId}`)

    return NextResponse.json({
      success: true,
      message: "Thumbnail removed successfully",
      bundleId,
    })
  } catch (error) {
    console.error("❌ [Bundle Thumbnail] Delete error:", error)
    return NextResponse.json(
      {
        error: "Failed to remove thumbnail",
        code: "DELETE_FAILED",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
