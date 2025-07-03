import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
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
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const bundleId = formData.get("bundleId") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    // Verify bundle ownership
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      // Try productBoxes collection as fallback
      const productBoxDoc = await db.collection("productBoxes").doc(bundleId).get()
      if (!productBoxDoc.exists) {
        return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
      }

      const productBoxData = productBoxDoc.data()
      if (productBoxData?.creatorId !== decodedToken.uid) {
        return NextResponse.json({ error: "Not authorized to modify this bundle" }, { status: 403 })
      }
    } else {
      const bundleData = bundleDoc.data()
      if (bundleData?.creatorId !== decodedToken.uid) {
        return NextResponse.json({ error: "Not authorized to modify this bundle" }, { status: 403 })
      }
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP images are allowed." },
        { status: 400 },
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
    }

    console.log(`📸 [Thumbnail Upload] Uploading thumbnail for bundle: ${bundleId}`)

    // Generate unique filename
    const fileExtension = file.name.split(".").pop() || "jpg"
    const fileName = `bundle-thumbnails/${bundleId}/${uuidv4()}.${fileExtension}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      ContentLength: file.size,
      Metadata: {
        bundleId,
        creatorId: decodedToken.uid,
        originalName: file.name,
      },
    })

    await r2Client.send(uploadCommand)

    // Construct public URL
    const publicUrl = `${PUBLIC_URL}/${fileName}`

    // Update bundle with thumbnail URL
    const updateData = {
      coverImage: publicUrl,
      customPreviewThumbnail: publicUrl,
      updatedAt: new Date(),
    }

    if (bundleDoc.exists) {
      await bundleDoc.ref.update(updateData)
    } else {
      await db.collection("productBoxes").doc(bundleId).update(updateData)
    }

    console.log(`✅ [Thumbnail Upload] Thumbnail uploaded successfully: ${publicUrl}`)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      message: "Thumbnail uploaded successfully",
    })
  } catch (error) {
    console.error("❌ [Thumbnail Upload] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to upload thumbnail",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bundleId = searchParams.get("bundleId")
    const fileName = searchParams.get("fileName")

    if (!bundleId || !fileName) {
      return NextResponse.json({ error: "Bundle ID and file name are required" }, { status: 400 })
    }

    // Verify bundle ownership
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      const productBoxDoc = await db.collection("productBoxes").doc(bundleId).get()
      if (!productBoxDoc.exists) {
        return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
      }

      const productBoxData = productBoxDoc.data()
      if (productBoxData?.creatorId !== decodedToken.uid) {
        return NextResponse.json({ error: "Not authorized to modify this bundle" }, { status: 403 })
      }
    } else {
      const bundleData = bundleDoc.data()
      if (bundleData?.creatorId !== decodedToken.uid) {
        return NextResponse.json({ error: "Not authorized to modify this bundle" }, { status: 403 })
      }
    }

    console.log(`🗑️ [Thumbnail Delete] Deleting thumbnail: ${fileName}`)

    // Delete from R2
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    })

    await r2Client.send(deleteCommand)

    // Update bundle to remove thumbnail URL
    const updateData = {
      coverImage: null,
      customPreviewThumbnail: null,
      updatedAt: new Date(),
    }

    if (bundleDoc.exists) {
      await bundleDoc.ref.update(updateData)
    } else {
      await db.collection("productBoxes").doc(bundleId).update(updateData)
    }

    console.log(`✅ [Thumbnail Delete] Thumbnail deleted successfully`)

    return NextResponse.json({
      success: true,
      message: "Thumbnail deleted successfully",
    })
  } catch (error) {
    console.error("❌ [Thumbnail Delete] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to delete thumbnail",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
